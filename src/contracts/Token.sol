pragma solidity ^0.5.0;

contract Token{
    string public name = "DApp Token";
    string public symbol = "DApp";
    uint256 public decimals = 18;
    uint256 public total_supply;

    constructor() public {
        total_supply = 1000000 * (10**decimals);
    }
}