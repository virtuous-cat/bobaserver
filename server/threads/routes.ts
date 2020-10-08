import debug from "debug";
import express from "express";
import {
  getThreadByStringId,
  createThread,
  markThreadVisit,
  muteThread,
  unmuteThread,
  hideThread,
  unhideThread,
} from "./queries";
import { isLoggedIn } from "../auth-handler";
import { makeServerThread, ensureNoIdentityLeakage } from "../response-utils";

const info = debug("bobaserver:threads:routes-info");
const log = debug("bobaserver:threads:routes-log");

const router = express.Router();

router.get("/:id", isLoggedIn, async (req, res) => {
  const { id } = req.params;
  log(`Fetching data for thread with id ${id}`);

  // NOTE: if updating this (and it makes sense) also update
  // the method for thread creation + retrieval.
  const thread = await getThreadByStringId({
    threadId: id,
    // @ts-ignore
    firebaseId: req.currentUser?.uid,
  });
  info(`Found thread: `, thread);

  if (thread === false) {
    res.sendStatus(500);
    return;
  }
  if (!thread) {
    res.sendStatus(404);
    return;
  }

  const serverThread = makeServerThread(thread);
  ensureNoIdentityLeakage(serverThread);

  info(`sending back data for thread ${id}.`);
  res.status(200).json(serverThread);
});

router.post("/:threadId/mute", isLoggedIn, async (req, res) => {
  const { threadId } = req.params;
  // @ts-ignore
  if (!req.currentUser) {
    return res.sendStatus(401);
  }
  log(`Setting thread muted: ${threadId}`);

  if (
    !(await muteThread({
      // @ts-ignore
      firebaseId: req.currentUser.uid,
      threadId,
    }))
  ) {
    res.sendStatus(500);
    return;
  }

  info(`Marked last visited time for thread: ${threadId}.`);
  res.status(200).json();
});

router.post("/:threadId/unmute", isLoggedIn, async (req, res) => {
  const { threadId } = req.params;
  // @ts-ignore
  if (!req.currentUser) {
    return res.sendStatus(401);
  }
  log(`Setting thread unmuted: ${threadId}`);

  if (
    !(await unmuteThread({
      // @ts-ignore
      firebaseId: req.currentUser.uid,
      threadId,
    }))
  ) {
    res.sendStatus(500);
    return;
  }

  info(`Marked last visited time for thread: ${threadId}.`);
  res.status(200).json();
});

router.post("/:threadId/hide", isLoggedIn, async (req, res) => {
  const { threadId } = req.params;
  // @ts-ignore
  if (!req.currentUser) {
    return res.sendStatus(401);
  }
  log(`Setting thread hidden: ${threadId}`);

  if (
    !(await hideThread({
      // @ts-ignore
      firebaseId: req.currentUser.uid,
      threadId,
    }))
  ) {
    res.sendStatus(500);
    return;
  }

  info(`Marked last visited time for thread: ${threadId}.`);
  res.status(200).json();
});

router.post("/:threadId/unhide", isLoggedIn, async (req, res) => {
  const { threadId } = req.params;
  // @ts-ignore
  if (!req.currentUser) {
    return res.sendStatus(401);
  }
  log(`Setting thread visible: ${threadId}`);

  if (
    !(await unhideThread({
      // @ts-ignore
      firebaseId: req.currentUser.uid,
      threadId,
    }))
  ) {
    res.sendStatus(500);
    return;
  }

  info(`Marked last visited time for thread: ${threadId}.`);
  res.status(200).json();
});

router.get("/:threadId/visit", isLoggedIn, async (req, res) => {
  const { threadId } = req.params;
  // @ts-ignore
  if (!req.currentUser) {
    return res.sendStatus(401);
  }
  log(`Setting last visited time for thread: ${threadId}`);

  if (
    !(await markThreadVisit({
      // @ts-ignore
      firebaseId: req.currentUser.uid,
      threadId,
    }))
  ) {
    res.sendStatus(500);
    return;
  }

  info(`Marked last visited time for thread: ${threadId}.`);
  res.status(200).json();
});

router.get("/activity/latest", async (req, res) => {
  // TODO: implement. Gets latest active threads.
  res.status(501);
});

router.post("/:boardSlug/create", isLoggedIn, async (req, res, next) => {
  // @ts-ignore
  if (!req.currentUser) {
    return res.sendStatus(401);
  }
  const { boardSlug } = req.params;
  log(`Creating thread in board with slug ${boardSlug}`);
  const {
    content,
    forceAnonymous,
    defaultView,
    large,
    whisperTags,
    indexTags,
    categoryTags,
    contentWarnings,
    identityId,
  } = req.body;

  const threadStringId = await createThread({
    // @ts-ignore
    firebaseId: req.currentUser.uid,
    content,
    defaultView,
    anonymityType: "everyone",
    isLarge: !!large,
    boardSlug: boardSlug,
    whisperTags,
    indexTags,
    categoryTags,
    contentWarnings,
    identityId,
  });
  info(`Created new thread`, threadStringId);

  if (threadStringId === false) {
    res.sendStatus(500);
    return;
  }

  const thread = await getThreadByStringId({
    threadId: threadStringId as string,
    // @ts-ignore
    firebaseId: req.currentUser?.uid,
  });
  info(`Found thread: `, thread);

  if (thread === false) {
    res.sendStatus(500);
    return;
  }
  if (!thread) {
    res.sendStatus(404);
    return;
  }

  const serverThread = makeServerThread(thread);
  ensureNoIdentityLeakage(serverThread);

  info(`sending back data for thread ${threadStringId}.`);
  res.status(200).json(serverThread);
});

export default router;
