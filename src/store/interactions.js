import Web3 from "web3"
import Token from '../abis/Token.json'
import Exchange from '../abis/Exchange.json'
import { 
    web3Loaded, 
    web3AccountLoaded,
    tokenLoaded,
    exchangeLoaded, 
    cancelledOrdersLoaded,
    filledOrdersLoaded,
    allOrdersLoaded
    } from "./actions"


export const loadWeb3 = async (dispatch) => {
    if(typeof window.ethereum !== 'undefined'){
      const web3 = new Web3('http://localhost:7545')
      dispatch(web3Loaded(web3))
      return web3
    } 
    else {
      window.alert('Please install MetaMask')
      window.location.assign("https://metamask.io/")
    }
}

export const loadAccount = async (web3, dispatch) => {
    const accounts = await web3.eth.getAccounts()
    const account = accounts[0]
    dispatch(web3AccountLoaded(account))
    return account
}

export const loadToken = async (web3, networkId, dispatch) => {
    // setting up Token 
    //const abi = Token.abi
    //const networks = Token.networks[networkId].address
    try { 
        const token = new web3.eth.Contract(Token.abi, Token.networks[networkId].address)
        dispatch(tokenLoaded(token))
        return token
    }
    catch(error) {
        console.log('Contract not deployed to the current network. Please select another network with Metamask.')
        return null
    }
}

export const loadExchange = async (web3, networkId, dispatch) => {
    try {
      const exchange = new web3.eth.Contract(Exchange.abi, Exchange.networks[networkId].address)
      dispatch(exchangeLoaded(exchange))
      return exchange
    } 
    catch (error) {
      console.log('Contract not deployed to the current network. Please select another network with Metamask.')
      return null
    }
}

export const loadAllOrders = async (exchange, dispatch) => {
  // Fetch all cancelled orders and add to redux store
  const cancelStream = await exchange.getPastEvents('Cancel', {fromBlock:0, toBlock: 'latest'})
  const cancelledOrders = cancelStream.map((event) => event.returnValues)
  dispatch(cancelledOrdersLoaded(cancelledOrders))

  // Fetch all filled orders and add to redux store
  const tradeStream = await exchange.getPastEvents('Trade', {fromBlock:0, toBlock: 'latest'})
  const filledOrders = tradeStream.map((event) => event.returnValues)
  dispatch(filledOrdersLoaded(filledOrders))

  // Fetch all orders and add to redux store
  const orderStream = await exchange.getPastEvents('Order', {fromBlock:0, toBlock: 'latest'})
  const allOrders = orderStream.map((event) => event.returnValues)
  dispatch(allOrdersLoaded(allOrders))
}