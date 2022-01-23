import React, { useState, useEffect } from 'react';
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import nftImage from '../public/nft-w-frame.png'

import Web3 from "web3";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import MembershipToken from "../artifacts/contracts/MembershipToken.sol/MembershiptToken.json";

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
  let [hasBalance, setHasBalance] = useState(false);
  let [hasMinted, setHasMinted] = useState(true);
  let [claimed, setClaimed] = useState(false);
  let [claiming, setClaiming] = useState(false);
  let [mintFinished, setMintFinished] = useState(false);

  let web3Modal: any
  if (process.browser) {
    web3Modal = new Web3Modal({
      cacheProvider: true,
      theme: 'dark',
      providerOptions
    });
  }

  const claimToken = async () => {
    setClaiming(true);
    let Contract = new web3.eth.Contract(MembershipToken.abi, '0xB4D21CAF1cc3DAdec5EEcf753F5fc23094DDFb65');
    await Contract.methods.mintCollectible().send({ from: account });
    setClaiming(false);
    setClaimed(true);
  }

  const connect = async () => {
    try {
      if (process.browser) {
        let provider = await web3Modal.connect();
        setWeb3(new Web3(provider));
        let web3: any = new Web3(provider);
        let chain = await web3.eth.getChainId();

        let Contract = new web3.eth.Contract(MembershipToken.abi, '0xB4D21CAF1cc3DAdec5EEcf753F5fc23094DDFb65');
        let accounts = await web3.eth.getAccounts()
        let balance = await Contract.methods.hasBalance().call({ from: accounts[0] })
        let minted = await Contract.methods.minted(accounts[0]).call({ from: accounts[0] })

        setAccount(accounts[0]);
        setChainId(chain);
        setHasBalance(balance)
        setHasMinted(minted)
      }
    } catch (err) {
      console.log('Err: ', err);
    }
  }
  const bottomButton = () => {
    if (mintFinished) {
      return (<h5 className={styles.description}>
        All 1000 memberships have been minted, 
        </h5>
      )
    } else if (claiming) {
      return <h5 className={styles.description}>NFT being claimed...</h5>
    } if (claimed) {
      return <h4 className={[styles.win, styles.tada].join(' ')}>Mint claimed!</h4>
    } else if (account === '') {
      return <button className={styles.btn} onClick={connect} >Connect Wallet </button>
    } else if (chainId !== 137) {
      return <h5 className={styles.description}> Please connect to the Ethereum Network</h5>
    } else {
      return <button className={styles.btn} onClick={claimToken} >Mint Membership NFT</button>
    }
  }

  useEffect(() => {
    let mintStatus = async () => {
      let web3: any = new Web3(`https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA}`);

      let Contract = new web3.eth.Contract(MembershipToken.abi, '0xB4D21CAF1cc3DAdec5EEcf753F5fc23094DDFb65');
      let totalMinted = await Contract.methods.tokenCounter().call()
      if (totalMinted > 999) setMintFinished(true);
    }

    mintStatus();
  }, []);


  return (
    <div className={styles.container}>
      <Head>
        <title>Bank Runner</title>
        <meta name="description" content="Claim your CyborgDAO memberhip NFT and join the futuristic elite hoarding the top Solarpunk NFT's." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.header}>
        <h1 className={styles.title}>Bankrunner</h1>

        <a href="https://opensea.io/collection/bankrunner-yf94gwllm8" target="_blank" rel="noreferrer">
          <div className={styles.imageWrapper}>
            <Image src={nftImage} className={styles.logo} alt="logo" />
          </div>
        </a>
        <h5 className={[styles.description, styles.descriptionSize].join(' ')}>
          Holder, claim your CyborgDAO membership
        </h5>
        {bottomButton()}
      </main>

      <footer className={styles.footer}>
      </footer>
    </div>
  )
}
