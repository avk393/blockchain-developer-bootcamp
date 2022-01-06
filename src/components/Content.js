import React, {Component} from 'react'
import { connect } from 'react-redux'
//import { accountSelector } from '../store/selectors.js'
import { exchangeSelector } from '../store/selectors.js'
import { loadAllOrders, subscribeToEvents } from '../store/interactions.js'
import Trades from './Trades'
import OrderBook from './OrderBook'
import Transactions from './Transactions'
import PriceChart from './PriceChart'
import Balance from './Balance'
import Orders from './Orders'

class Content extends Component {
    componentWillMount() {
        this.loadBlockchainData(this.props)
    }
    
    async loadBlockchainData(props) {
        const { dispatch, exchange } = props
        await loadAllOrders(exchange, dispatch) 
        await subscribeToEvents(dispatch, exchange)
    }

    render() {
        return (
            <div className="content">
                <div className="vertical-split">
                    <Balance />
                    <Orders />
                </div>
                <OrderBook />
                <div className="vertical-split">
                    <PriceChart />
                    <Transactions />
                </div>
                <Trades />
            </div>
        )
    }
}

function mapStateToProps(state) {
    return  {
      exchange: exchangeSelector(state)
    }
}

export default connect(mapStateToProps)(Content)