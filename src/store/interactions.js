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
    allOrdersLoaded,
    orderCancelling,
    orderCancelled,
    orderFilling,
    orderFilled,
    orderMade,
    etherBalanceLoaded,
    tokenBalanceLoaded,
    exchangeEtherBalanceLoaded,
    exchangeTokenBalanceLoaded,
    balancesLoaded,
    balancesLoading,
    buyOrderMaking,
    sellOrderMaking
    } from "./actions"
  import { ETHER_ADDRESS } from '../helpers'


export const loadWeb3 = async (dispatch) => {
    if(typeof window.ethereum !== 'undefined'){
      const web3 = new Web3(window.ethereum)
      dispatch(web3Loaded(web3))
      return web3
    } 
    else {
      window.alert('Please install MetaMask')
      window.location.assign("https://metamask.io/")
    }
}

export const loadAccount = async (web3, dispatch) => {
  /*const accounts = await web3.eth.requestAccounts()
  const account = accounts[0]
  dispatch(web3AccountLoaded(account))
  return account*/
  const accounts = await web3.eth.getAccounts()
  console.log(accounts.length)
  console.log("Accounts: ", accounts)
  const account = await accounts[0]
  if(typeof account !== 'undefined'){
    dispatch(web3AccountLoaded(account))
    return account
  } else {
    window.alert('Please login with MetaMask')
    return null
  }
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

export const cancelOrder = (dispatch, exchange, order, account) => {
  exchange.methods.cancelOrder(order.id).send({from: account})
  .on('transactionHash', (hash) => {
    dispatch(orderCancelling())
  })
  .on('error', (error) => {
    console.log(error)
    window.alert("There was an error cancelling the order!")
  })
}

export const subscribeToEvents = async (dispatch, exchange) => {
  exchange.events.Cancel({}, (error, event) => {
    if(event !== null) dispatch(orderCancelled(event.returnValues))
  })

  exchange.events.Trade({}, (error, event) => {
    if(event !== null) dispatch(orderFilled(event.returnValues))
  })

  exchange.events.Deposit({}, (error, event) => {
    if(event !== null) dispatch(balancesLoaded())
  })

  exchange.events.Withdraw({}, (error, event) => {
    if(event !== null) dispatch(balancesLoaded())
  })

  exchange.events.Order({}, (error, event) => {
    if(event !== null) dispatch(orderMade(event.returnValues))
  })
}

export const fillOrder = (dispatch, exchange, order, account) => {
  exchange.methods.fillOrder(order.id).send({from: account})
  .on('transactionHash', (hash) => {
    dispatch(orderFilling())
  })
  .on('error', (error) => {
    console.log(error)
    window.alert("There was an error filling the order!")
  })
}

export const loadBalances = async (dispatch, web3, exchange, token, account) => {
  if(typeof account !== 'undefined') {
    // Ether balance in wallet
    const etherBalance = await web3.eth.getBalance(account)
    dispatch(etherBalanceLoaded(etherBalance))

    // Token balance in wallet
    const tokenBalance = await token.methods.balanceOf(account).call()
    dispatch(tokenBalanceLoaded(tokenBalance))

    // Ether balance in exchange
    const exchangeEtherBalance = await exchange.methods.balanceOf(ETHER_ADDRESS, account).call()
    dispatch(exchangeEtherBalanceLoaded(exchangeEtherBalance))

    // Token balance in exchange
    const exchangeTokenBalance = await exchange.methods.balanceOf(token.options.address, account).call()
    dispatch(exchangeTokenBalanceLoaded(exchangeTokenBalance))

    // Trigger all balances loaded
    dispatch(balancesLoaded())
  } 
  else {
    window.alert('Please login with MetaMask')
  }
}

export const depositEther = async (dispatch, exchange, web3, etherDepositAmount, account) => {
  await exchange.methods.depositEther().send({ from: account,  value: web3.utils.toWei(etherDepositAmount, 'ether') })
  .on('transactionHash', (hash) => {
    dispatch(balancesLoading())
  })
  .on('error',(error) => {
    console.error(error)
    window.alert(`There was an error!`)
  })

  // Ether balance in exchange
  const exchangeEtherBalance = await exchange.methods.balanceOf(ETHER_ADDRESS, account).call()
  dispatch(exchangeEtherBalanceLoaded(exchangeEtherBalance))
}

export const withdrawEther = async (dispatch, exchange, web3, etherWithdrawAmount, account) => {
  //console.log("Ether amount: ", web3.utils.toWei(etherWithdrawAmount, 'ether'))
  await exchange.methods.withdrawEther(web3.utils.toWei(etherWithdrawAmount, 'ether')).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(balancesLoading())
  })
  .on('Error',(error) => {
    console.error(error)
    window.alert(`There was an error!`)
  })

  // Ether balance in exchange
  const exchangeEtherBalance = await exchange.methods.balanceOf(ETHER_ADDRESS, account).call()
  dispatch(exchangeEtherBalanceLoaded(exchangeEtherBalance))
}

export const depositToken = (dispatch, exchange, web3, token, tokenDepositAmount, account) => {
  console.log(tokenDepositAmount)
  tokenDepositAmount = web3.utils.toWei(tokenDepositAmount, 'ether')
  console.log(tokenDepositAmount)
  
  token.methods.approve(exchange.options.address, tokenDepositAmount).send({ from: account })
  .on('transactionHash', (hash) => {
    console.log("here")
    exchange.methods.depositToken(token.options.address, tokenDepositAmount).send({ from: account })
    .on('transactionHash', (hash) => {
      dispatch(balancesLoading())
    })
    .on('error',(error) => {
      console.log("shit")
      console.error(error)
      window.alert(`There was an error!`)
    })
  })
  .on('error',(error) => {
    console.error(error)
    window.alert(`There was an error!`)
  })
}

export const withdrawToken = (dispatch, exchange, web3, token, tokenWithdrawAmount, account) => {
  exchange.methods.withdrawToken(token.options.address, web3.utils.toWei(tokenWithdrawAmount, 'ether')).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(balancesLoading())
  })
  .on('error',(error) => {
    console.error(error)
    window.alert(`There was an error!`)
  })
}

export const makeBuyOrder = (dispatch, exchange, web3, token, order, account) => {
  const tokenGet = token.options.address
  const amountGet = web3.utils.toWei(order.amount, 'ether')
  const tokenGive = ETHER_ADDRESS
  const amountGive = web3.utils.toWei((order.amount * order.price).toString(), 'ether')

  exchange.methods.makeOrder(tokenGet, amountGet, tokenGive, amountGive).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(buyOrderMaking())
  })
  .on('error', (error) => {
    console.error(error)
    window.alert(`There was an error!`)
  })
}

export const makeSellOrder = (dispatch, exchange, web3, token, order, account) => {
  const tokenGet = ETHER_ADDRESS
  const amountGet = web3.utils.toWei((order.amount * order.price).toString(), 'ether')
  const tokenGive = token.options.address
  const amountGive = web3.utils.toWei(order.amount, 'ether')

  exchange.methods.makeOrder(tokenGet, amountGet, tokenGive, amountGive).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(sellOrderMaking())
  })
  .on('error', (error) => {
    console.error(error)
    window.alert(`There was an error!`)
  })
}