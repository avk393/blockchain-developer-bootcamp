export const EVM_REVERT = "Sender does not have the funds for this transaction"
export const EX_REVERT = "Exchange is not approved for this transaction"
export const ETHER_ADDRESS = '0x0000000000000000000000000000000000000000'

export const ether = (n) => {
    return new web3.utils.BN(
        web3.utils.toWei(n.toString(), 'ether')
    )
}

export const tokens = (n) => ether(n)