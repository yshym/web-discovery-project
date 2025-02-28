#!/usr/bin/env node

const Endpoints = require("./build/hpnv2/endpoints.js").default;
const crypto = require('crypto').webcrypto;

function random() {
  const values = crypto.getRandomValues(new Uint32Array(2));
  return (2 ** 32 * (values[0] & 0x1fffff) + values[1]) / 2 ** 53;
}

const getDate = () => {
  const now = new Date();
  const date = now.getDate();
  const month = now.getMonth();
  const d = (date < 10 ? "0" : "") + date;
  const m = (month < 9 ? "0" : "") + (month + 1);
  const y = now.getFullYear();
  return `${y}${m}${d}`;
};

const buildTestMsg = () => {
  return {
    action: "query0",
    "anti-duplicates": Math.floor(random() * 10000000),
    channel: "brave-native-android",
    payload: {
      ctry: "ca",
      lang: "en-CA",
      q: "best cookie recipes",
      qurl: "https://www.google.com/ (PROTECTED)",
    },
    sender: "hpnv2",
    ts: getDate(),
    type: "wdp",
    ver: "1.0",
  };
};

const sendMessage = (msg) => {
  const start = new Date();
  const endpoints = new Endpoints();
  endpoints
    .send(msg, { instant: true })
    .then(() => {
      console.log(
        "Successfully sent message after",
        (Date.now() - start) / 1000.0,
        "sec",
        msg,
      );
    })
    .catch((e) => {
      console.log(
        `Finally giving up on sending message (reason: ${e}, elapsed: ${
          (Date.now() - start) / 1000.0
        } sec)`,
        msg,
      );
    });
};

sendMessage(buildTestMsg());
