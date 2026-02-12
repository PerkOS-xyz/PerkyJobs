// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PerkyReputation.sol";
import "../src/PerkyJobsRegistry.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        PerkyReputation reputation = new PerkyReputation();
        console.log("PerkyReputation deployed at:", address(reputation));

        PerkyJobsRegistry registry = new PerkyJobsRegistry();
        console.log("PerkyJobsRegistry deployed at:", address(registry));

        vm.stopBroadcast();
    }
}
