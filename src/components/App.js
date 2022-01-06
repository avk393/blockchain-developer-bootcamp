import React, {Component} from 'react'
import './App.css'
import Navbar from './Navbar'
import Content from './Content'
import Spinner from './Spinner'
import {loadWeb3, loadAccount, loadToken, loadExchange} from '../store/interactions.js'
import { connect } from 'react-redux'
import { contractsLoadedSelector } from '../store/selectors.js'

class App extends Component {
  componentWillMount() {
    this.loadBlockchainData(this.props.dispatch)
  }

  async loadBlockchainData(dispatch) {
    // Loading blockchain network
    const web3 = await loadWeb3(dispatch)

    // Loading Exchange deployment account
    //const network = await web3.eth.net.getNetworkType()
    const networkId = await web3.eth.net.getId()
    //const accounts = 
    await loadAccount(web3, dispatch)

    // Loading Token contract
    const token = await loadToken(web3, networkId, dispatch)
    if(!token) {
      window.alert('Token smart contract not detected on current network. Please use another network in MetaMask')
      return
    }

    // Loading Exchange contract
    const exchange = await loadExchange(web3, networkId, dispatch)
    if(!exchange) {
      window.alert('Exchange smart contract not detected on current network. Please use another network in MetaMask')
      return
    }

    // checking for proper contract initialization
    //const totalSupply = await token.methods.total_supply().call()
    //console.log("token", totalSupply)
  }

  render() {
    return ( 
      <div>
        <Navbar />
        { this.props.contractsLoaded ? <Content /> : <div className="content"><Spinner type="table"/></div> }
      </div>
    );
  }
}

function mapStateToProps(state) {
  return  {
    contractsLoaded: contractsLoadedSelector(state)
  }
}

export default connect(mapStateToProps)(App);
