# Burn Reward
This is the NFT brun_reward program by receiving spl-token($MAD)

## Install Dependencies
- Install `node` and `yarn`
- Install `ts-node` as global command
- Confirm the solana wallet preparation: `/home/---/.config/solana/id.json` in test case

## Usage
- Main script source for all functionality is here: `/cli/script.ts`
- Program account types are declared here: `/cli/types.ts`
- Idl to make the JS binding easy is here: `/cli/brun_reward.ts`

Able to test the script functions working in this way.
- Change commands properly in the main functions of the `script.ts` file to call the other functions
- Confirm the `ANCHOR_WALLET` environment variable of the `ts-node` script in `package.json`
- Run `yarn ts-node`

# Features

##  How to deploy this program?
First of all, you have to git clone in your PC.
In the folder `backend`, in the terminal 
1. `yarn`

2. `anchor build`
   In the last sentence you can see:  
```
 To deploy this program:
  $ solana program deploy /home/.../backend/target/deploy/brun_reward.so
The program address will default to this keypair (override with --program-id):
  /home/.../backend/target/deploy/brun_reward-keypair.json
```  
3. `solana-keygen pubkey /home/.../backend/target/deploy/brun_reward-keypair.json`
4. You can get the pubkey of the `program ID : ex."5N...x6k"`
5. Please add this pubkey to the lib.rs
  `declare_id!("5N...x6k");`
6. Please add this pubkey to the Anchor.toml
  `brun_reward = "5N...x6k"`
7. Please add this pubkey to the types.ts
  `export const BURN_PROGRAM_ID = new PublicKey("5N...x6k");`
  
8. `anchor build` again
9. `solana program deploy /home/.../backend/target/deploy/brun_reward.so`
10. `yarn ts-node` then  you can get `global_authority`
11. Run the command line like:
```powershell
spl-token transfer GkXn6PUbcvpwAzVCgJFychVhAhjwZRMJWmtqzar3SnqG 8480000 Gx...PNF9 --fund-recipient
```

<p align = "center">
Then, you can enjoy this program 🎭
</p>
</br>

## How to use?

### A Project Owner
The project owner should initialize the project. the function `initProject`
```js
    await initProject();
```

### Users
Users can burn their NFT and receive $MAD by using this program.

```js
export const burnReward = async (
    mint: PublicKey,
)
```
