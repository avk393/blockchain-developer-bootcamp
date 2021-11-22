import {EVM_REVERT, EX_REVERT, ETHER_ADDRESS, ether, tokens} from './helpers'
const { iteratee, inRange } = require("lodash");
const { default: Web3 } = require("web3");

const Token = artifacts.require('./Token');
const Exchange = artifacts.require('./Exchange');

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('Exchange', ([deployer, feeAccount, user1, user2]) => {
    let token
    let exchange
    const feePercent = 10

    beforeEach(async() => {
        token =  await Token.new()
        token.transfer(user1, tokens(100), {from: deployer})

        exchange = await Exchange.new(feeAccount, feePercent)
    })

    describe('deployment', () => {
        it('tracks the fee account', async() => {
            const result = await exchange.feeAccount()
            result.should.equal(feeAccount)
        })

        it('tracks the fee percent', async() => {
            const result = await exchange.feePercent()
            result.toString().should.equal(feePercent.toString())
        })
    })

    describe('depositing ETHER', ()=> {
        let result
        let amount

        beforeEach( async() => {
            amount = ether(1)
            result = await exchange.depositEther({from: user1, value: amount})
        })
        
        it('it tracks Ether deposit', async() => {
            const balance = await exchange.tokens(ETHER_ADDRESS, user1)
            balance.toString().should.equal(amount.toString())
        })

        it('emits a deposit event', async() => {
            const log = result.logs[0]
            log.event.should.equal('Deposit');
            const event = log.args
            event.token.toString().should.equal(ETHER_ADDRESS, 'token contract is correct')
            event.user.toString().should.equal(user1.toString(), 'user is correct')
            event.amount.toString().should.equal(amount.toString(), 'amount is correct')
            event.balance.toString().should.equal(amount.toString(), 'balance is correct')
        })
    })

    describe('fallback', () => {
        it('reverts when Ether is sent', async() => {
            await exchange.sendTransaction({value: 1, from: user1}).should.be.rejectedWith('VM Exception while processing transaction: revert')
        })
    })

    describe('depositing tokens', () => {
        let result
        let amount = tokens(10)

        beforeEach(async() => {
            await token.approve(exchange.address, tokens(10), {from: user1})
            result = await exchange.depositToken(token.address, amount, {from: user1})
        })

        describe('success', async() => {
            it('tracks the token deposit', async() => {
                let balance
                balance = await token.balanceOf(exchange.address)
                balance.toString().should.equal(amount.toString())
                balance = await exchange.tokens(token.address, user1)
                balance.toString().should.equal(amount.toString())  
            })

            it('emits a deposit event', async() => {
                const log = result.logs[0]
                log.event.should.equal('Deposit');
                const event = log.args
                event.token.toString().should.equal(token.address, 'token contract is correct')
                event.user.toString().should.equal(user1.toString(), 'user is correct')
                event.amount.toString().should.equal(amount.toString(), 'amount is correct')
                event.balance.toString().should.equal(amount.toString(), 'balance is correct')
            })
        })

        describe('failure', async() => {
            it('rejects Ether deposits', async() => {
                await exchange.depositToken(ETHER_ADDRESS, amount, {from: user1}).should.be.rejected
            })

            it('fails when no tokens are approved', async() => {
                await exchange.depositToken(token.address, amount, {from: user1}).should.be.rejectedWith(EX_REVERT)
            })
        })
    })

    describe('withdrawing Ether', ()=> {
        let result
        let amount = ether(1)

        beforeEach( async() => {
            await exchange.depositEther({from: user1, value: amount})
        })
        
        describe('success', async() => { 
            beforeEach( async() => {
                result = await exchange.withdrawEther(amount, {from: user1})
            })

            it('withdraws Ether funds', async() => {
                const balance = await exchange.tokens(ETHER_ADDRESS, user1)
                balance.toString().should.equal('0')
            })

            it('emits a withdraw event', async() => {
                const log = result.logs[0]
                log.event.should.equal('Withdraw');
                const event = log.args
                event.token.toString().should.equal(ETHER_ADDRESS)
                event.user.toString().should.equal(user1.toString())
                event.amount.toString().should.equal(amount.toString())
                event.balance.toString().should.equal('0')
            })
        })

        describe('failure', async() => { 
            it('rejects withdraws for insuffiecient balances', async() => {
                await exchange.withdrawEther(ether(100), {from: user1}).should.be.rejected
            })
        })
    })

    describe('wtihdrawing tokens', ()=> {
        let result
        let amount
        
        describe('success', async() => { 
            beforeEach(async() => {
                amount = tokens(10)
                await token.approve(exchange.address, amount, {from: user1})
                await exchange.depositToken(token.address, amount, {from: user1})

                result = await exchange.withdrawToken(token.address, amount, {from: user1})
            })

            it('withdraws token funds', async() => {
                const balance = await exchange.tokens(token.address, user1)
                balance.toString().should.equal('0')
            })
        })

        describe('failure', async() => { 
            
        })
    })

    describe('making order', ()=> {
        let result
        let amount = tokens(1)

        beforeEach(async() => {
            result = await exchange.makeOrder(token.address, amount, ETHER_ADDRESS, ether(1), {from: user1})
        })

        it('tracks the newly created order', async() => {
            const orderCount = await exchange.orderCount()
            orderCount.toString().should.equal('1', 'order coount is correct')
            const order = await exchange.orders('1')
            order.id.toString().should.equal('1', 'id is correct')
            order.user.should.equal(user1)
            order.tokenGet.should.equal(token.address)
            order.amountGet.toString().should.equal(amount.toString())
            order.tokenGive.should.equal(ETHER_ADDRESS)
            order.amountGive.toString().should.equal(ether(1).toString())
            order.timestamp.toString().length.should.be.at.least(1)
        })
    })

    describe('order actions', () => {
        beforeEach(async() => {
            // user1 deposits ether only
            await exchange.depositEther({from: user1, value: ether(1)})
            // give tokens to user2
            await token.transfer(user2, tokens(100), {from: deployer})
            // user2 deposits tokens
            await token.approve(exchange.address, tokens(2), {from: user2})
            await exchange.depositToken(token.address, tokens(2), {from: user2})
            // user1 makes an order to swap ETHER for token
            await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), {from: user1})
        })

        describe('filling orders', async() => {
            let result

            describe('success', async() => {
                beforeEach(async() => {
                    result = await exchange.fillOrder('1', {from: user2})
                })
                
                it('executes trades & charges fees', async() => {
                    let balance
                    balance = await exchange.balanceOf(token.address, user1)
                    balance.toString().should.equal(tokens(1).toString(), 'user1 received tokens')
                    balance = await exchange.balanceOf(ETHER_ADDRESS, user2)
                    balance.toString().should.equal(ether(1).toString(), 'user2 received tokens')
                    balance = await exchange.balanceOf(ETHER_ADDRESS, user1)
                    balance.toString().should.equal('0', 'user2 ETH deducted')
                    balance = await exchange.balanceOf(token.address, user2)
                    balance.toString().should.equal(tokens(0.9).toString(), 'user2 tokens deducted with fee applied')
                    balance = await exchange.balanceOf(token.address, feeAccount)
                    balance.toString().should.equal(tokens(0.1).toString(), 'fee received')
                })
            })


        })
    })

})