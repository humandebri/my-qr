// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const idlFactory = ({ IDL }: any) => {
  const GetAccountTransactionsArgs = IDL.Record({
    'account_identifier': IDL.Text,
    'start': IDL.Opt(IDL.Nat64),
    'max_results': IDL.Nat64,
  });

  const Tokens = IDL.Record({ 'e8s': IDL.Nat64 });
  
  const TimeStamp = IDL.Record({ 'timestamp_nanos': IDL.Nat64 });
  
  const Operation = IDL.Variant({
    'Transfer': IDL.Record({
      'to': IDL.Text,
      'fee': Tokens,
      'from': IDL.Text,
      'amount': Tokens,
    }),
    'Mint': IDL.Record({
      'to': IDL.Text,
      'amount': Tokens,
    }),
    'Burn': IDL.Record({
      'from': IDL.Text,
      'amount': Tokens,
    }),
  });
  
  const Transaction = IDL.Record({
    'memo': IDL.Nat64,
    'operation': Operation,
    'created_at_time': IDL.Opt(TimeStamp),
    'timestamp': IDL.Opt(TimeStamp),
  });
  
  const TransactionWithId = IDL.Record({
    'id': IDL.Nat64,
    'transaction': Transaction,
  });
  
  const GetTransactionsResponse = IDL.Record({
    'balance': IDL.Nat64,
    'transactions': IDL.Vec(TransactionWithId),
    'oldest_tx_id': IDL.Opt(IDL.Nat64),
  });
  
  const GetTransactionsResult = IDL.Variant({
    'Ok': GetTransactionsResponse,
    'Err': IDL.Record({ 'message': IDL.Text }),
  });

  return IDL.Service({
    'get_account_identifier_transactions': IDL.Func(
      [GetAccountTransactionsArgs],
      [GetTransactionsResult],
      ['query']
    ),
  });
}; 