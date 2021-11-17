import {EVM_REVERT, tokens} from './helpers'
const { iteratee, inRange } = require("lodash");
const { default: Web3 } = require("web3");

const Token = artifacts.require('./Token');

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('Token', ([deployer, receiver, exchange]) => {
    const name = 'DApp Token'
    const symbol = 'DApp'
    const decimals = '18'
    const total_supply = tokens(1000000)
    let token

    beforeEach(async() => {
        token = await Token.new()
    })

    describe('deployment', () => {
        it('tracks the name', async() => {
            const result = await token.name()
            result.should.equal(name)
        })

        it('tracks the symbols', async() => {
            const result = await token.symbol()
            result.should.equal(symbol)
        })

        it('tracks the decimals', async() => {
            const result = await token.decimals()
            result.toString().should.equal(decimals)
        })

        it('tracks the total supply', async() => {
            const result = await token.total_supply()
            result.toString().should.equal(total_supply.toString())
        })

        it('assigns the total supply', async() => {
            const result = await token.balanceOf(deployer)
            result.toString().should.equal(total_supply.toString())
        })
    })

    describe('sending tokens', () => {
        let result
        let amount

        beforeEach( async() => {
            amount = tokens(100)
            result = await token.transfer(receiver, amount, {from: deployer})
        })

        describe('success', async() => {
            it('transfers token balances', async() => {
                let balanceOf
                
                balanceOf = await token.balanceOf(deployer)
                balanceOf.toString().should.equal(tokens(999900).toString())
                balanceOf = await token.balanceOf(receiver)
                balanceOf.toString().should.equal(tokens(100).toString())
            })

            it('emits transfer event', async() => {
                const log = result.logs[0]
                log.event.should.equal('Transfer');
                const event = log.args
                event.from.toString().should.equal(deployer, 'from is correct')
                event.to.toString().should.equal(receiver, 'to is correct')
                event.value.toString().should.equal(amount.toString(), 'amount is correct')
            })
        })

        describe('failure', async() => {
            it('rejects insufficient balances', async() => {
                let invalidAmount
                invalidAmount = tokens(100000000) 
                await token.transfer(receiver, invalidAmount, {from: deployer}).should.be.rejectedWith(EVM_REVERT)
            })

            it('rejects invalid recipients', async()=> {
                await token.transfer(0x1, amount, {from: deployer}).should.be.rejected
            })
        })
    })

    describe('approving tokens', ()=> {
        let result
        let amount

        beforeEach( async() => {
            amount = tokens(100)
            result = await token.approve(exchange, amount, {from: deployer})
        })
        
        describe('success', async() => { 
            it('allocates an allowance for delegated token spending', async() =>{
                const allowance = await token.allowance(deployer, exchange)
                allowance.toString().should.equal(amount.toString())
            })

            it('emits Approval event', async() => {
                const log = result.logs[0]
                log.event.should.equal('Approval');
                const event = log.args
                event.owner.toString().should.equal(deployer, 'owner is correct')
                event.spender.toString().should.equal(exchange, 'exchange is correct')
                event.value.toString().should.equal(amount.toString(), 'amount is correct')
            })
        })

        describe('failure', async() => { 
            it('rejects invalid spenders', async() => {
                await token.approve(0x0, amount, {from: deployer}).should.be.rejected
            })
        })
    })

    describe('exchange actvities', () => {
        let result
        let amount

        beforeEach( async() => {
            amount = tokens(100)
            await token.approve(exchange, amount, {from: deployer})
        })

        describe('success', async() => {
            beforeEach(async() => {
                result = await token.transferFrom(deployer, receiver, amount, {from: exchange})
            })

            it('transfers token balances', async() => {
                let balanceOf
                
                balanceOf = await token.balanceOf(deployer)
                balanceOf.toString().should.equal(tokens(999900).toString())
                balanceOf = await token.balanceOf(receiver)
                balanceOf.toString().should.equal(tokens(100).toString())
            })

            it('emits transfer event', async() => {
                const log = result.logs[0]
                log.event.should.equal('Transfer');
                const event = log.args
                event.from.toString().should.equal(deployer, 'from is correct')
                event.to.toString().should.equal(receiver, 'to is correct')
                event.value.toString().should.equal(amount.toString(), 'amount is correct')
            })
        })

        describe('failure', async() => {
             it('rejects insufficient amounts', async() => {
                let invalidAmount
                invalidAmount = tokens(100000000) 
                await token.transferFrom(deployer, receiver, invalidAmount, {from: exchange}).should.be.rejectedWith("Exchange is not approved for this transaction")
            })

            it('rejects invalid recipients', async()=> {
                await token.transferFrom(deployer, 0x0, amount, {from: exchange}).should.be.rejected
            }) 
        })
    })
})