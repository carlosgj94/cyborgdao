// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import '@rari-capital/solmate/src/tokens/ERC721.sol';
import {IERC20} from "./interfaces/IERC20.sol";
import {IBottoStaking} from "./interfaces/IBottoStaking.sol";

/// @notice Too few tokens remain
error InsufficientTokensRemain();

/// @notice Balance of sender is or would be over token limit per holder
// @param balance Token balance
// @param limit Token limit per holder
error SenderBalanceOverTokenLimit(uint256 balance, uint8 limit);

/// @notice Not enough ether sent to mint
/// @param cost The minimum amount of ether required to mint
/// @param sent The amount of ether sent to this contract
error InsufficientFunds(uint256 cost, uint256 sent);

/// @notice Supply send to update is lower than the current mints count
/// @param supply Amount sent to update
/// @param tokenCount Current minst amount
error SupplyLowerThanTokenCount(uint256 supply, uint256 tokenCount);

/// @notice Supply send to update is lower than the current mints count
/// @param supply Amount sent to update
/// @param absoluteMaximumTokens hardcoded maximum number of tokens
error SupplyHigherThanAbsoluteMaximumTokens(uint256 supply, uint256 absoluteMaximumTokens);

/// @notice Account trying to mint the token is not a botto staker
/// @param user account sending the transaction
error UserIsNotAStaker(address user);


/// @title Turing Key
/// @author GoldmanDAO
/// @dev Note that mint price and Token URI are updateable
contract TuringKey is ERC721, Ownable {
    /// @dev BottoStaking contract
    IBottoStaking private bottoStaking;

    ///  @dev amount of time when the contract is going to be locked
    uint256 public timelock; 

    /// @dev Base URI
    string private internalTokenURI;

    /// @dev Number of tokens
    uint256 public tokenCount;

    /// @notice Limit of tokens per holder
    uint8 public constant HOLDER_TOKEN_LIMIT = 10;

    /// @notice The maximum number of nfts to mint, not updateable
    uint256 public constant ABSOLUTE_MAXIMUM_TOKENS = 969;

    /// @notice The actual supply of nfts. Can be updated by the owner
    uint256 public currentSupply = 200;

    /// @notice Cost to mint a token
    uint256 public publicSalePrice = 0.5 ether;

    //////////////////////////////////////////////////
    //                  MODIFIER                    //
    //////////////////////////////////////////////////

    /// @dev Checks mint requirements
    /// -> Mint in time or pre-release authorized sender
    /// -> Enough supply
    /// -> Balance of target address in limits
    /// -> Value sended matches price
    modifier canMint(address to, uint8 amount) {
        if (block.timestamp < timelock) {
            if(bottoStaking.userStakes(msg.sender) == 0 || bottoStaking.userStakes(to) == 0) {
                revert UserIsNotAStaker(msg.sender);
            }
        }
        if (tokenCount + amount >= currentSupply) {
            revert InsufficientTokensRemain();
        }
        if (balanceOf[to] + amount > HOLDER_TOKEN_LIMIT) {
            revert SenderBalanceOverTokenLimit(balanceOf[to] + amount, HOLDER_TOKEN_LIMIT);
        }
        if (publicSalePrice * amount > msg.value) {
            revert InsufficientFunds(publicSalePrice * amount, msg.value);
        }
        _;
    }

    //////////////////////////////////////////////////
    //                 CONSTRUCTOR                  //
    //////////////////////////////////////////////////

    /// @dev Sets the ERC721 Metadata and OpenSea Proxy Registry Address
    constructor(string memory _tokenURI, IBottoStaking _bottoStaking) ERC721("Turing Key", "TKEY") {
      internalTokenURI = _tokenURI;
      bottoStaking = _bottoStaking;
      timelock = block.timestamp + 2 days;
    }

    //////////////////////////////////////////////////
    //                  METADATA                    //
    //////////////////////////////////////////////////

    /// @dev Returns the URI for the given token
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        return internalTokenURI;
    }

    /////////////////////////////////////////////////
    //                MINTING LOGIC                 //
    //////////////////////////////////////////////////

    /// @notice Mint one or more tokens
    /// @param to whom the token is being sent to
    /// @param amount the amount of tokens to mint
    function mint(address to, uint8 amount)
        public
        virtual
        payable
        canMint(to, amount) 
    {
        for (uint8 i=0; i < amount; i++) {
            tokenCount++;
            _mint(to, tokenCount);
        }
    }

    /// @notice Safe mint one or mont tokens
    /// @param to whom the token is being sent to
    /// @param amount the amount of tokens to mint
    function safeMint(address to, uint8 amount)
        public
        virtual
        payable
        canMint(to, amount)
    {
        for (uint8 i=0; i < amount; i++) {
            tokenCount++;
            _safeMint(to, tokenCount);
        }
    }

    /// @notice Safe mint a token
    /// @param to whom the token is being sent to
    /// @param data needed for the contract to be call
    function safeMint(
        address to,
        uint8 amount,
        bytes memory data
    )
        public
        virtual
        payable
        canMint(to, amount)
    {
        for (uint8 i=0; i < amount; i++) {
            tokenCount++;
            _safeMint(to, tokenCount, data);
        }
    }

     //////////////////////////////////////////////////
    //                BURNING LOGIC                 //
    //////////////////////////////////////////////////

    function burn(uint256 tokenId) public virtual {
        _burn(tokenId);
    }

    //////////////////////////////////////////////////
    //                 ADMIN LOGIC                  //
    //////////////////////////////////////////////////

    /// @notice Sets the tokenURI for the membership
    function setInternalTokenURI(string memory _internalTokenURI) external onlyOwner {
        internalTokenURI = _internalTokenURI;
    }

    /// @dev Allows the owner to update the amount of memberships to be minted
    function updateCurrentSupply(uint256 _supply) public onlyOwner {
        if (_supply > ABSOLUTE_MAXIMUM_TOKENS) {
            revert SupplyHigherThanAbsoluteMaximumTokens(_supply, ABSOLUTE_MAXIMUM_TOKENS);
        } 
        if (_supply < tokenCount) {
            revert SupplyLowerThanTokenCount(_supply, tokenCount);
        }
        currentSupply = _supply;
    }

    /// @dev Allows the owner to change the prize of the membership 
    function setPublicSalePrice(uint256 _publicSalePrice) public onlyOwner {
      publicSalePrice = _publicSalePrice;
    }

    /// @dev Allows the owner to withdraw eth
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }

    /// @dev Allows the owner to withdraw any erc20 tokens sent to this contract
    function withdrawTokens(IERC20 token) public onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        token.transfer(msg.sender, balance);
    }

    //////////////////////////////////////////////////
    //                 ROYALTIES                    //
    //////////////////////////////////////////////////
    // @dev Support for EIP 2981 Interface by overriding erc165 supportsInterface
    // function supportsInterface(bytes4 interfaceId) public pure virtual override returns (bool) {
    //     return
    //         interfaceId == 0x01ffc9a7 || // ERC165 Interface ID for ERC165
    //         interfaceId == 0x80ac58cd || // ERC165 Interface ID for ERC721
    //         interfaceId == 0x5b5e139f || // ERC165 Interface ID for ERC721Metadata
    //         interfaceId == 0x2a55205a;  // ERC165 Interface ID for ERC2981
    // }

    /// @dev Royalter information
    // function royaltyInfo(uint256 tokenId, uint256 salePrice)
    //     external
    //     view
    //     returns (address receiver, uint256 royaltyAmount)
    // {
    //     receiver = address(this);
    //     royaltyAmount = (salePrice * 5) / 100;
    // }
}
