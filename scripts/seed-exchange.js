const Token = artifacts.require("Token");
const Exchange = artifacts.require("Exchange")

// Required utils
const ETHER_ADDRESS = '0x0000000000000000000000000000000000000000'
const ether = (n) => {
    return new web3.utils.BN(
        web3.utils.toWei(n.toString(), 'ether')
    )
}
const tokens = (n) => ether(n)

module.exports = async function(callback) {
    try {
        // fetching accounts from wallet
        const accounts = await web3.eth.getAccounts()

        // Fetch deployed token
        const token = await Token.deployed()
        console.log('Token fetched: ', token.address)

        // Fetch deployed exchange
        const exchange = await Exchange.deployed()
        console.log('Exchange fetched: ', exchange.address)

        // Give tokens to accounts[1]
        const sender = accounts[0]
        const receiver = accounts[1]
        let amount = web3.utils.toWei('1000', 'ether')
        await token.transfer(receiver, amount, {from: sender})
        console.log('Transferred ${amount} tokens from ${sender} to ${receiver}')

        // Creates exchange users
        user1 = accounts[0]
        user2 = accounts[1]

        // User 1 deposits ETH
        amount = 1
        await exchange.depositEther({from: user1, value: ether(amount)})
        console.log('Deposited ${amount} Ether from ${user1}')

        // User 2 approves tokens
        amount = 10000
        await token.approve(exchange.address, tokens(amount), {from: user2})

        // User 2 deposits tokens
        await exchange.depositToken(token.address, tokens(amount), {from: user2})
        console.log('Deposited ${amount} tokens from ${user2}')

    } catch(err){
        console.log(err)
    }

    callback()
}