import React, { useState, useEffect } from 'react';
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import nftImage from '../public/cyberpepe.png'

import Web3 from "web3";
import Web3Modal from "web3modal";
import HTMLReactParser from 'html-react-parser';
import WalletConnectProvider from "@walletconnect/web3-provider";
import MembershipToken from "../artifacts/contracts/MembershipToken.sol/MembershipToken.json";

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
    let Contract = new web3.eth.Contract(MembershipToken.abi, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
    let costPerMint = Web3.utils.toWei("0.07", "ether");
    await Contract.methods.mint(account).send({ from: account, value: costPerMint })
    .on("confirmation", function(receipt: Object){ 
        console.log(receipt);
        setClaimed(true);
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
        console.log("Connected?")

        let Contract = new web3.eth.Contract(MembershipToken.abi, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
        let accounts = await web3.eth.getAccounts()
        // let balance = await Contract.methods.hasBalance().call({ from: accounts[0] })
        // let minted = await Contract.methods.minted(accounts[0]).call({ from: accounts[0] })

        setAccount(accounts[0]);
        setChainId(chain);
        // setHasBalance(balance)
        // setHasMinted(minted)
      }
    } catch (err) {
      console.log('Err: ', err);
    }
  }
  const bottomButton = () => {
    if (mintFinished) {
      return (<h5 className={styles.description}>
        All 1000 turing keys have been minted,
      </h5>
      )
    } else if (claiming) {
      return <h5 className={styles.description}>Key being claimed...</h5>
    } if (claimed) {
      return <h4 className={[styles.win, styles.tada].join(' ')}>Key minted!</h4>
    } else if (account === '') {
      return <button className={styles.btn} onClick={connect} >Connect Wallet </button>
    } else if (chainId !== 1337) {
      return <h5 className={styles.description}>Please connect to the Ethereum Network</h5>
    } else {
      return <button className={styles.btn} onClick={claimToken} >Mint Turing Keys</button>
    }
  }

  const showBalance = () => {
    if (balance == 0) {
      return 'Mint your <a class="type-yellow">Turing Keys</a>'
    } else {
      return `Hello cyborg!<br/>You are already a proud owner of <a class="type-yellow">${balance}</a> keys.<br/>You can mint more below.`
    }
  }

  useEffect(() => {
    let mintStatus = async () => {
      // let web3: any = new Web3(`https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA}`);
      let web3: any = new Web3(`http://localhost:8545`);

      let Contract = new web3.eth.Contract(MembershipToken.abi, '0x5FbDB2315678afecb367f032d93F642f64180aa3');
      let totalMinted = await Contract.methods.tokenCount().call()

      let accounts = await web3.eth.getAccounts();

      let balance = await Contract.methods.balanceOf(accounts[0]).call();

      setBalance(balance);

      if (totalMinted > 999) setMintFinished(true);
    }

    mintStatus();
  }, []);


  return (
    <div className={styles.container}>
      <Head>
        <title>Turing Keys Mint</title>
        <meta name="description" content="Mint your Turing Keys." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.header}>
        <div className={styles.contents}>
        <div className={styles.title}>
            <a>Cyborg DAO</a>
            <h1>Turing Keys</h1>
        </div>

        <div className={styles.imageWrapper}>
          <Image src={nftImage} className={styles.nftimage} alt="NFT image" />
        </div>
        <h5 className={[styles.description, styles.descriptionSize].join(' ')}>
          { HTMLReactParser(showBalance()) }
        </h5>
        {bottomButton()}
        </div>
        <div className={styles.borders}></div>
      </main>

      <footer className={styles.footer}>
      </footer>
    </div>
  )
}
