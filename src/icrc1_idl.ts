// import type { InterfaceFactory } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";

export const idlFactory = ({ IDL }: { IDL: any }) => {
  const TransferError = IDL.Variant({
    'BadFee' : IDL.Record({ 'expected_fee' : IDL.Nat }),
    'BadBurn' : IDL.Record({ 'min_burn_amount' : IDL.Nat }),
    'InsufficientFunds' : IDL.Record({ 'balance' : IDL.Nat }),
    'TooOld' : IDL.Null,
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'TemporarilyUnavailable' : IDL.Null,
    'Duplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat }),
    'GenericError' : IDL.Record({ 'error_code' : IDL.Nat, 'message' : IDL.Text }),
  });

  const Account = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });

  const TransferArgs = IDL.Record({
    'to' : Account,
    'fee' : IDL.Opt(IDL.Nat),
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'from_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time' : IDL.Opt(IDL.Nat64),
    'amount' : IDL.Nat,
  });

  return IDL.Service({
    icrc1_balance_of: IDL.Func(
      [IDL.Record({ owner: IDL.Principal })],
      [IDL.Nat],
      ["query"]
    ),
    icrc1_transfer: IDL.Func(
      [TransferArgs],
      [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : TransferError })],
      [],
    ),
  });
}; 