"use client";

import { useEffect, useState } from "react";
import {
  type Doc,
  initSatellite,
  setDoc,
  getDoc,
  listDocs,
} from "@junobuild/core-peer";
import { nanoid } from "nanoid";

type Record = {
  hello: string;
};

export default function Home() {
  const [record, setRecord] = useState<Doc<Record> | undefined>(undefined);
  const [key, setKey] = useState<string | undefined>(undefined);
  const [records, setRecords] = useState<Doc<Record>[]>([]); // 一覧用
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initSatellite();
        setIsReady(true);
      } catch (err) {
        console.error("Satellite init failed", err);
        setError("Satelliteの初期化に失敗しました");
      }
    };

    init();
  }, []);
  
  const insert = async () => {
    try {
      const myId = nanoid();
      const doc = await setDoc({
        collection: "demo",
        doc: {
          key: myId ,
          data: {
            hello: "world",
          },
          description: "This is a description"
        },
      });

      setRecord(doc);
      setKey(doc.key);
      setError(null);
    } catch (err) {
      console.error("Insert failed", err);
      setError("データの保存に失敗しました");
    }
  };

  const get = async () => {
    if (!key) return;

    try {
      const result = await getDoc({
        collection: "demo",
        key,
      });

      console.log("Get done", result);
      setRecord(result as Doc<Record>);
    } catch (err) {
      console.error("Get failed", err);
      setError("ドキュメントの取得に失敗しました");
    }
  };

  const list = async () => {
    try {
      const result = await listDocs<Record>({
        collection: "demo",
      });

      setRecords(result.items);
      console.log("List done", result.items);
    } catch (err) {
      console.error("List failed", err);
      setError("ドキュメントの一覧取得に失敗しました");
    }
  };

  return (
    <main className="p-4">
      {!isReady && <p>初期化中...</p>}
      {isReady && (
        <>
          <div className="flex gap-2 mb-4">
            <button onClick={insert} className="border p-2 rounded">
              Insert a document
            </button>
            <button onClick={get} className="border p-2 rounded">
              Get a document
            </button>
            <button onClick={list} className="border p-2 rounded">
              List documents
            </button>
          </div>

          {record && (
            <>
              <p>Key (last get/inserted): {record.key}</p>
              <p>Data: {record.data.hello}</p>
            </>
          )}

          {records.length > 0 && (
            <div className="mt-4">
              <h2 className="font-bold">All documents in "demo":</h2>
              <ul className="list-disc pl-6">
                {records.map((doc) => (
                  <li key={doc.key}>
                    Key: {doc.key} | Data: {doc.data.hello}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      {error && <p className="text-red-500">{error}</p>}
    </main>
  );
}