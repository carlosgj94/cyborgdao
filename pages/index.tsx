import React, { useState, useEffect } from 'react';
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import nftImage from '../public/turing-key.gif'

import Web3 from "web3";
import Web3Modal from "web3modal";
import HTMLReactParser from 'html-react-parser';
import WalletConnectProvider from "@walletconnect/web3-provider";
import TuringKey from "../artifacts/contracts/TuringKey.sol/TuringKey.json";

const providerOptions = {
    walletconnect: {
        package: WalletConnectProvider,
        options: {
            infuraId: process.env.NEXT_PUBLIC_INFURA
        }
    }
}

export default function Home() {
    let [web3, setWeb3] = useState<any>({});
    let [account, setAccount] = useState('');
    let [chainId, setChainId] = useState(0);
    let [balance, setBalance] = useState(0);
    let [connected, setConnected] = useState(false);
    let [claiming, setClaiming] = useState(false);
    let [mintLocked, setMintLocked] = useState(false);
    let [totalMinted, setTotalMinted] = useState(0);
    let [currentSupply, setCurrentSupply] = useState(969);
    let [keysAmount, setKeysNumber] = useState(1);

    let web3Modal: any;
    let contractAddress: string = String(process.env.contractAddress);
    let mintPrice: string = String(process.env.mintPrice);

    if (process.browser) {
        web3Modal = new Web3Modal({
            cacheProvider: true,
            theme: 'dark',
            providerOptions
        });
    }

    const setConnection = async (account: string, chainId: number) => {
        setAccount(account);
        setChainId(chainId);
        if (account && chainId === Number(process.env.chainId)) {
            setConnected(true);
        } else {
            setConnected(false);
        }
    }

    const claimToken = async () => {
        setClaiming(true);
        let Contract = new web3.eth.Contract(TuringKey.abi, contractAddress);
        let costPerMint = Web3.utils.toWei(mintPrice, "ether");
        let value = Number(costPerMint) * keysAmount;

        await Contract.methods.mint(account, keysAmount).send({ from: account, value: value })
            .on("confirmation", function(receipt: Object) {
                console.log(receipt);
                setClaiming(false);
            })
            .on("error", function(error: Error) {
                console.log(error);
                setClaiming(false);
            });
    }

    const connect = async () => {
        try {
            if (process.browser) {
                let provider = await web3Modal.connect();
                setWeb3(new Web3(provider));
                let web3: any = new Web3(provider);
                let chain = await web3.eth.getChainId();
                let Contract = new web3.eth.Contract(TuringKey.abi, contractAddress);
                console.log("Connected?")

                let accounts = await web3.eth.getAccounts()
                let accountBalance = await Contract.methods.balanceOf(accounts[0]).call();

                setConnection(accounts[0], chain);
                setBalance(accountBalance);
            }
        } catch (err) {
            console.log('Err: ', err);
            setConnection(account, chainId);
        }
    }

    const showMintStatus = () => {

        let keyText = () => {
            if (balance > 1) { return 'keys' } else { return 'key' }
        };

        let balanceText = () => {
            if (connected && balance != 0) {
                return <div> You proudly hold <a className="type-pink">{balance}</a> {keyText()}.</div>
            }
        }

        let statusText = () => {
            if (chainId !== Number(process.env.chainId)) {
                return <div>Please connect to the Ethereum Network</div>
            }
            else if (claiming) {
                return <div><a className="type-pink">Claiming...</a></div>
            }
        }

        if (balanceText() || statusText()) {
            return (<div className={styles.balanceInfo}>{balanceText()} {statusText()}</div>)
        }
    }

    const mintButton = () => {

        function updateKeysNumber(diff: number) {
            let newNumber = keysAmount + diff;
            if (0 < newNumber && newNumber <= 10) {
                setKeysNumber(newNumber);
            }
        };

        let buttonText = () => {
            if (keysAmount > 1) { return 'Turing Keys' } else { return 'Turing Key' }
        };

        let buttonHTML = () => {
            if (mintLocked) {
                return <button className={[styles.btn, styles.btnMain].join(' ')} disabled>Mint Locked</button>
            } else if (connected) {
                return <button className={[styles.btn, styles.btnMain].join(' ')} onClick={claimToken} >Mint {keysAmount} {buttonText()}</button>
            } else {
                return <button className={[styles.btn, styles.btnMain].join(' ')} onClick={connect} >Connect Wallet</button>
            }
        };

        return (
            <div className={styles.mintButtonSection}>
                {buttonHTML()}
                <div className={styles.balanceModSection}>
                    <button className={[styles.btns, styles.btnPlus].join(' ')} onClick={() => updateKeysNumber(1)}>+</button>
                    <button className={[styles.btns, styles.btnLess].join(' ')} onClick={() => updateKeysNumber(-1)}>-</button>
                </div>
            </div>
        );
    }

    useEffect(() => {
        let mintStatus = async () => {
            let web3: any = new Web3(String('https://mainnet.infura.io/v3/'+process.env.NEXT_PUBLIC_INFURA));
            let Contract = new web3.eth.Contract(TuringKey.abi, contractAddress);
            let chain = await web3.eth.getChainId();
            let _totalMinted = parseInt(await Contract.methods.tokenCount().call());
            let _currentSupply = parseInt(await Contract.methods.currentSupply().call());

            let accounts = await web3.eth.getAccounts();
            if (accounts.length != 0) {
                let accountBalance = await Contract.methods.balanceOf(accounts[0]).call();
                setBalance(accountBalance);
            }

            setConnection(accounts[0], chain);
            setTotalMinted(_totalMinted);
            setCurrentSupply(_currentSupply);

            if (_totalMinted >= _currentSupply) {
                setMintLocked(true);
            }
        }
        mintStatus();
    }, []);


    return (
        <div className={styles.container}>
            <Head>
                <title>Turing Keys Mint</title>
                <meta name="description" content="Mint your Turing Keys." />
            </Head>

            <main className={styles.header}>
                <div className={styles.contents}>
                    <div className={styles.title}>
                        <a>Cyborg DAO</a>
                        <h1 title="Turing Keys">Turing Keys</h1>
                    </div>

                    <div className={styles.box}>
                        <div className={styles.imageWrapper}>
                            <Image src={nftImage} width='600' height='600' layout='responsive' className={styles.nftimage} alt="NFT image" />
                        </div>
                        <div className={styles.mintInfo}>
                            {totalMinted}/{currentSupply} | 0.5 ETH
                        </div>
                        {mintButton()}
                    </div>
                    {showMintStatus()}
                </div>
                <div className={styles.borders}></div>
            </main>

            <footer className={styles.footer}>
            </footer>
        </div>
    )
}
