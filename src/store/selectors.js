import { get, groupBy, reject, maxBy, minBy } from 'lodash'
import moment from 'moment'
import { createSelector } from 'reselect'
import { ETHER_ADDRESS, GREEN, RED, ether, tokens } from '../helpers'

const account = state => get(state, 'web3.account')
export const accountSelector = createSelector(account, a=>a)

const tokenLoaded = state => get(state, 'token.loaded', false)
export const tokenLoadedSelector = createSelector(tokenLoaded, tl=>tl) 

const exchangeLoaded = state => get(state, 'exchange.loaded', false)
export const exchangeLoadedSelector = createSelector(exchangeLoaded, el=>el)


const exchange = state => get(state, 'exchange.contract', false)
export const exchangeSelector = createSelector(exchange, e=>e)

export const contractsLoadedSelector = createSelector(
    tokenLoaded, 
    exchangeLoaded,
    (tl,el) => (tl && el)
)

const allOrdersLoaded = state => get(state, 'exchange.allOrders.loaded', false)
//export const allOrdersLoadedSelector = createSelector(allOrdersLoaded, loaded=>loaded)
const allOrders = state => get(state, 'exchange.allOrders.data', [])
//export const allOrdersSelector = createSelector(allOrders, o => o)

const cancelledOrdersLoaded = state => get(state, 'exchange.cancelledOrders.loaded', false)
export const cancelledOrdersLoadedSelector = createSelector(cancelledOrdersLoaded, loaded=>loaded)
const cancelledOrders = state => get(state, 'exchange.cancelledOrders.data', [])
export const cancelledOrdersSelector = createSelector(cancelledOrders, o => o)

const filledOrdersLoaded = state => get(state, 'exchange.filledOrders.loaded', false)
export const filledOrdersLoadedSelector = createSelector(filledOrdersLoaded, loaded=>loaded)

const filledOrders = state => get(state, 'exchange.filledOrders.data', [])
export const filledOrdersSelector = createSelector(
    filledOrders, 
    (orders) => {
        // Sort by ascending time for red/green color sorting
        orders = orders.sort((a,b) => a.timestamp - b.timestamp)
        // Format orders
        orders = decorateFilledOrders(orders)
        // Sort orders by descending date
        orders = orders.sort((a,b) => b.timestamp - a.timestamp)
        return orders
    }
)

const decorateFilledOrders = (orders) => {
    let previousOrder = orders[0]
    
    return(
        orders.map((order) => {
            order = decorateOrder(order)
            order = decorateFilledOrder(order, previousOrder)
            previousOrder = order
            return order
        })
    )
}

const decorateOrder = (order) => {
    let etherAmount
    let tokenAmount

    if(order.tokenGive === ETHER_ADDRESS){
        etherAmount = order.amountGive
        tokenAmount = order.amountGet
    }
    else{
        etherAmount = order.amountGet
        tokenAmount = order.amountGive
    }

    let tokenPrice = (etherAmount/tokenAmount)
    const precision = (10**5)
    tokenPrice = Math.round(tokenPrice*precision)/precision

    return({
        ...order,
        etherAmount: ether(etherAmount),
        tokenAmount: tokens(tokenAmount),
        tokenPrice,
        formattedTimeStamp: moment.unix(order.timestamp).format('h:mm:ss a M/D')
    })
}

const decorateFilledOrder = (order, previousOrder) => {
    return({
        ...order,
        tokenPriceClass: tokenPriceClass(order.tokenPrice, order.id, previousOrder)
    })
}

const tokenPriceClass = (tokenPrice, id, previousOrder) => {
    if(previousOrder.id === id) return GREEN

    if(previousOrder.tokenPrice <= tokenPrice) return GREEN
    else return RED
}

const decorateOrderBookOrders = (orders) => {
    return(
        orders.map((order) => {
            order = decorateOrder(order)
            order = decorateOrderBookOrder(order)
            return order
        })
    )
}

const decorateOrderBookOrder = (order) => {
    const orderType = order.tokenGive === ETHER_ADDRESS ? 'buy' : 'sell'
    return({
        ...order,
        orderType,
        orderTypeClass: (orderType === 'buy' ? GREEN : RED),
        orderFillClass: (orderType === 'buy' ? 'sell' : 'buy')
    })
}

const openOrders = state => {
    const all = allOrders(state)
    const cancelled = cancelledOrders(state)
    const filled = filledOrders(state)

    const openOrders = reject(all, (order) => {
        const orderFilled = filled.some((o) => o.id === order.id)
        const orderCancelled = cancelled.some((o) => o.id === order.id)
        return(orderFilled || orderCancelled)
    })

    return openOrders
}

const orderBookLoaded = state => cancelledOrdersLoaded(state) && filledOrdersLoaded(state) && allOrdersLoaded(state)
export const orderBookLoadedSelector = createSelector(orderBookLoaded, loaded => loaded)

export const orderBookSelector = createSelector(
    openOrders,
    (orders) => {
        // Decorate orders then sort by order type
        orders = decorateOrderBookOrders(orders)
        orders = groupBy(orders, 'orderType')

        const buyOrders = get(orders, 'buy', [])
        orders = {
            ...orders,
            buyOrders: buyOrders.sort((a,b) => b.tokenPrice - a.tokenPrice)
        }

        const sellOrders = get(orders, 'sell', [])
        orders = {
            ...orders,
            sellOrders: sellOrders.sort((a,b) => b.tokenPrice - a.tokenPrice)
        }
        return orders
    }
)

const decorateMyFilledOrder = (order, account) => {
    const myOrder = order.user === account

    let orderType
    if(myOrder) orderType = order.tokenGive === ETHER_ADDRESS ? 'buy' : 'sell'
    else orderType = order.tokenGive === ETHER_ADDRESS ? 'sell' : 'buy'

    return({
        ...order,
        orderType,
        orderTypeClass: (orderType==='buy' ? GREEN : RED),
        orderSign: (orderType==='buy' ? '+' : '-')
    })
}

const decorateMyFilledOrders = (orders, account) => {
    return(
        orders.map((order) => {
            order = decorateOrder(order)
            order = decorateMyFilledOrder(order, account)
            return order
        })
    )
}

export const myFilledOrdersLoadedSelector = createSelector(filledOrdersLoaded, loaded => loaded)
export const myFilledOrdersSelector = createSelector(
    account,
    filledOrders,
    (account, filledOrders) => {
        // Find our orders and redress them
        filledOrders = filledOrders.filter((o) => o.user===account || o.userFill===account)
        filledOrders = filledOrders.sort((a,b) => a.timestamp - b.timestamp)
        filledOrders = decorateMyFilledOrders(filledOrders, account)
        return filledOrders
    }
)

const decorateMyOpenOrder = (order, account) => {
    let orderType = order.tokenGive === ETHER_ADDRESS ? 'buy' : 'sell'

    return({
        ...order,
        orderType,
        orderTypeClass: (orderType==='buy' ? GREEN : RED)
    })
}

const decorateMyOpenOrders = (orders, account) => {
    return(
        orders.map((order) => {
            order = decorateOrder(order)
            order = decorateMyOpenOrder(order, account)
            return order
        })
    )
}

export const myOpenOrdersLoadedSelector = createSelector(orderBookLoaded, loaded => loaded)
export const myOpenOrdersSelector = createSelector(
    account,
    openOrders,
    (account, openOrders) => {
        // Find our orders and redress them
        openOrders = openOrders.filter((o) => o.user===account || o.userFill===account)
        openOrders = openOrders.sort((a,b) => a.timestamp - b.timestamp)
        openOrders = decorateMyOpenOrders(openOrders, account)
        return openOrders
    }
)

const buildGraphData = (orders) => {
    // Group orders by hour
    orders = groupBy(orders, (o) => moment.unix(o.timestamp).startOf('hour').format())
    const hours = Object.keys(orders)
    // Build graph series
    const graphData = hours.map((hour) => {
        // Calculating values for candlestick
        const group = orders[hour]
        const open = group[0]
        const close = group[group.length - 1]
        const high = maxBy(group, 'tokenPrice')
        const low = minBy(group, 'tokenPrice')
        return({
            x: new Date(hour),
            y: [open.tokenPrice, high.tokenPrice, low.tokenPrice, close.tokenPrice]
        })
    })

    return graphData
}

export const priceChartLoadedSelector = createSelector(filledOrdersLoaded, loaded => loaded)
export const priceChartSelector = createSelector(
    filledOrders,
    (orders) => {
        // Sort by data ascending and decorate
        orders = orders.sort((a,b) => a.timestamp - b.timestamp)
        orders = orders.map((o) => decorateOrder(o))

        // Get last two orders for classification
        let secondLastOrder, lastOrder
        [secondLastOrder, lastOrder] = orders.slice(orders.length -2, orders.length)
        const lastPrice = get(lastOrder, 'tokenPrice', 0)
        const secondLastPrice = get(secondLastOrder, 'tokenPrice', 0)
        
        return({
            lastPrice,
            lastPriceChange: (lastPrice >= secondLastPrice ? '+' : '-'),
            series: [{
                data: buildGraphData(orders)
            }]
        })
    }
)

const orderCancelling = state => get(state, 'exchange.orderCancelling', false)
export const orderCancellingSelector = createSelector(orderCancelling, status=>status)