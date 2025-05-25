export const idlFactory = ({ IDL }: { IDL: any }) => {
  const Timestamp = IDL.Record({ 'timestamp_nanos' : IDL.Nat64 });
  const Tokens = IDL.Record({ 'e8s' : IDL.Nat64 });
  
  const Operation = IDL.Variant({
    'Approve' : IDL.Record({
      'fee' : Tokens,
      'from' : IDL.Text,
      'allowance' : Tokens,
      'expected_allowance' : IDL.Opt(Tokens),
      'expires_at' : IDL.Opt(Timestamp),
      'spender' : IDL.Text,
    }),
    'Burn' : IDL.Record({
      'from' : IDL.Text,
      'amount' : Tokens,
      'spender' : IDL.Opt(IDL.Text),
    }),
    'Mint' : IDL.Record({ 'to' : IDL.Text, 'amount' : Tokens }),
    'Transfer' : IDL.Record({
      'to' : IDL.Text,
      'fee' : Tokens,
      'from' : IDL.Text,
      'amount' : Tokens,
      'spender' : IDL.Opt(IDL.Text),
    }),
  });

  const Transaction = IDL.Record({
    'memo' : IDL.Nat64,
    'icrc1_memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'operation' : Operation,
    'timestamp' : IDL.Opt(Timestamp),
    'created_at_time' : IDL.Opt(Timestamp),
  });

  const TransactionWithId = IDL.Record({
    'id' : IDL.Nat64,
    'transaction' : Transaction,
  });

  const GetAccountIdentifierTransactionsArgs = IDL.Record({
    'max_results' : IDL.Nat64,
    'start' : IDL.Opt(IDL.Nat64),
    'account_identifier' : IDL.Text,
  });

  const GetAccountIdentifierTransactionsResponse = IDL.Variant({
    'Ok' : IDL.Record({
      'balance' : IDL.Nat64,
      'transactions' : IDL.Vec(TransactionWithId),
      'oldest_tx_id' : IDL.Opt(IDL.Nat64),
    }),
    'Err' : IDL.Record({ 'message' : IDL.Text }),
  });

  return IDL.Service({
    'get_account_identifier_transactions' : IDL.Func(
      [GetAccountIdentifierTransactionsArgs],
      [GetAccountIdentifierTransactionsResponse],
      ['query'],
    ),
  });
}; 