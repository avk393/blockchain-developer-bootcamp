pragma solidity ^0.5.0;
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Token{
    string public name = "DApp Token";
    string public symbol = "DApp";
    uint256 public decimals = 18;
    uint256 public total_supply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() public {
        // creating supply and supply owner
        total_supply = 1000000 * (10**decimals);
        balanceOf[msg.sender] = total_supply;
    }

    function _transfer(address _from, address _to, uint256 _value) internal {
        // require valid recipient
        require(_to != address(0));
        // require adequate funds from sender
        require(balanceOf[_from] >= _value, "Sender does not have the funds for this transaction");

        balanceOf[_from] = balanceOf[_from] - _value;
        balanceOf[_to] = balanceOf[_to] + _value;
        emit Transfer(_from, _to, _value);
    }

    function transfer(address _to, uint256 _value) public returns (bool success) {
        // require valid receiver address
        _transfer(msg.sender, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool success){
        require(_spender != address(0));
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success){
        require (allowance[_from][msg.sender] >= _value, "Exchange is not approved for this transaction");
        allowance[_from][msg.sender] = allowance[_from][msg.sender] - _value;
        _transfer(_from, _to, _value);
        return true;
    }
}