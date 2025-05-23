// import type { InterfaceFactory } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";

export const idlFactory = ({ IDL }: { IDL: any }) => {
  return IDL.Service({
    icrc1_balance_of: IDL.Func(
      [IDL.Record({ owner: IDL.Principal })],
      [IDL.Nat],
      ["query"]
    ),
  });
}; 