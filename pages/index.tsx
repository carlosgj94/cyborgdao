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
    let [hasBalance, setHasBalance] = useState(false);
    let [hasMinted, setHasMinted] = useState(true);
    let [claimed, setClaimed] = useState(false);
    let [claiming, setClaiming] = useState(false);
    let [mintFinished, setMintFinished] = useState(false);
    let [totalMinted, setTotalMinted] = useState(0);
    let [currentSupply, setCurrentSupply] = useState(969);

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

    const claimToken = async () => {
        setClaiming(true);
        let Contract = new web3.eth.Contract(TuringKey.abi, contractAddress);
        let costPerMint = Web3.utils.toWei(mintPrice, "ether");
        await Contract.methods.mint(account).send({ from: account, value: costPerMint })
            .on("confirmation", function(receipt: Object) {
                console.log(receipt);
                setClaimed(true);
                setClaiming(false);
                setBalance(balance+1);
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
                console.log("Connected?")

                let accounts = await web3.eth.getAccounts()

                setAccount(accounts[0]);
                setChainId(chain);
            }
        } catch (err) {
            console.log('Err: ', err);
        }
    }

    const mintButton = () => {
        if (mintFinished) {
            return (
            <div className={styles.mintStatus}>
                All <a className="type-pink">Turing Keys</a> claimed
            </div>
            )
        } else if (claiming) {
            return <div className={styles.mintStatus}><a className="type-pink">Key</a> being claimed...</div>
        } if (claimed) {
            return <div className={[styles.mintStatus, styles.tada].join(' ')}>Key minted!</div>
        } else if (account === '') {
            return <button className={[styles.mintStatus, styles.btn].join(' ')} onClick={connect} >Connect Wallet</button>
        } else if (chainId !== Number(process.env.chainId)) {
            return <div className={styles.mintStatus}>Please connect to the Ethereum Network</div>
        } else {
            return <button className={[styles.mintStatus, styles.btn].join(' ')} onClick={claimToken} >Mint Turing Keys</button>
        }
    }

    const showBalance = () => {
        if (balance != 0) {
            return <div className={[styles.balanceInfo, styles.tada].join(' ')}> You already are a proud holder of <a className="type-pink">{balance}</a> keys</div>
        }
    }

    useEffect(() => {
        let mintStatus = async () => {
            let web3: any = new Web3(String(process.env.NEXT_PUBLIC_INFURA));
            let balance: number = 0

            let Contract = new web3.eth.Contract(TuringKey.abi, contractAddress);
            let _totalMinted = await Contract.methods.tokenCount().call();
            let _currentSupply = await Contract.methods.currentSupply().call();

            let accounts = await web3.eth.getAccounts();
            if (accounts.length != 0) {
                balance = await Contract.methods.balanceOf(accounts[0]).call();
            }

            setBalance(balance);
            setTotalMinted(_totalMinted);
            setCurrentSupply(_currentSupply);

            setMintFinished(_totalMinted >= _currentSupply);
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
                    {showBalance()}
                </div>
                <div className={styles.borders}></div>
            </main>

            <footer className={styles.footer}>
            </footer>
        </div>
    )
}
