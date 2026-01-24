import React from 'react';
import { CardanoWallet, useWallet } from '@meshsdk/react';

export const WalletConnect: React.FC = () => {
    const { connected, wallet } = useWallet();

    return (
        <div className="wallet-connect-container p-4 bg-gray-800 rounded-lg shadow-md">
            <h3 className="text-lg font-bold mb-2 text-white">Cardano Wallet</h3>
            <div className="flex items-center justify-between">
                <CardanoWallet />
                {connected && (
                    <span className="text-green-400 text-sm ml-2">Connected</span>
                )}
            </div>
            {!connected && (
                <p className="text-gray-400 text-xs mt-2">
                    Connect your wallet to access NFT characters and staking.
                </p>
            )}
        </div>
    );
};
