import {
  BadRequest400Error,
  Forbidden403Error,
  Internal500Error,
  NotFound404Error,
} from "types/errors/api";
import {
  acceptInvite,
  checkUserOnRealm,
  getInviteDetails,
  getRealmIdsByUuid,
  getRealmInvites,
  getUserPermissionsForRealm,
} from "server/realms/queries";
import { createNewUser, getUserFromFirebaseId } from "server/users/queries";
import { ensureLoggedIn, withLoggedIn, withUserSettings } from "handlers/auth";
import { getRealmDataBySlug, getSettingsBySlug } from "./queries";

import { RealmPermissions } from "types/permissions";
import { createInvite } from "server/realms/queries";
import debug from "debug";
import { ensureRealmPermission } from "handlers/permissions";
import express from "express";
import firebaseAuth from "firebase-admin";
import { getBoards } from "../boards/queries";
import pool from "server/db-pool";
import { processBoardsSummary } from "utils/response-utils";
import { processRealmActivity } from "./utils";
import { randomBytes } from "crypto";

const info = debug("bobaserver:realms:routes-info");
const log = debug("bobaserver:realms:routes-log");
const error = debug("bobaserver:realms:routes-error");

const router = express.Router();

/**
 * @openapi
 * /realms/slug/{realm_slug}:
 *   get:
 *     summary: Fetches the top-level realm metadata by slug.
 *     operationId: getRealmsBySlug
 *     tags:
 *       - /realms/
 *     security:
 *       - {}
 *       - firebase: []
 *     parameters:
 *       - name: realm_slug
 *         in: path
 *         description: The slug of the realm.
 *         required: true
 *         schema:
 *           type: string
 *         examples:
 *           v0:
 *             summary: the v0 realm
 *             value: v0
 *     responses:
 *       200:
 *         description: The realm metadata.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Realm"
 *             examples:
 *               v0:
 *                 $ref: '#/components/examples/V0RealmResponse'
 *       404:
 *         description: The realm was not found.
 */
router.get("/slug/:realm_slug", withUserSettings, async (req, res) => {
  try {
    const currentUserSettings = req.currentUser?.settings || [];
    const { realm_slug } = req.params;
    const settings = await getSettingsBySlug({
      realmSlug: realm_slug,
      userSettings: currentUserSettings,
    });

    const realmData = await getRealmDataBySlug({ realmSlug: realm_slug });

    if (!realmData) {
      throw new NotFound404Error(`The realm ${realm_slug} was not found.`);
    }

    const realmPermissions = await getUserPermissionsForRealm({
      firebaseId: req.currentUser?.uid,
      realmId: realmData.string_id,
    });

    const boards = await getBoards({
      firebaseId: req.currentUser?.uid,
      realmId: realmData.string_id,
    });

    if (!boards) {
      res.status(500);
    }

    const realmBoards = processBoardsSummary({
      boards,
      isLoggedIn: !!req.currentUser?.uid,
    });
    res.status(200).json({
      id: realmData.string_id,
      slug: realm_slug,
      settings,
      realm_permissions: realmPermissions || [],
      boards: realmBoards,
    });
  } catch (e) {
    error(e);
    res.status(500).json({
      message: "There was an error fetching realm data.",
    });
  }
});

/**
 * @openapi
 * /realms/{realm_id}/activity:
 *   get:
 *     summary: Fetches latest activity summary for the realm.
 *     operationId: getRealmsActivityByUuid
 *     tags:
 *       - /realms/
 *     security:
 *       - {}
 *       - firebase: []
 *     parameters:
 *       - name: realm_id
 *         in: path
 *         description: The id of the realm.
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: The realm activity summary.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/RealmActivity"
 *       404:
 *         description: The realm was not found.
 */
router.get("/:realm_id/activity", async (req, res) => {
  try {
    const { realm_id } = req.params;

    // TODO[realms]: use a per-realm query here
    const boards = await getBoards({
      firebaseId: req.currentUser?.uid,
      realmId: realm_id,
    });

    if (!boards) {
      res.status(500);
    }

    const realmBoards = processRealmActivity({
      boards,
    });
    res.status(200).json({
      boards: realmBoards,
    });
  } catch (e) {
    error(e);
    res.status(500).json({
      message: "There was an error fetching realm data.",
    });
  }
});

/**
 * @openapi
 * /realms/{realm_id}/invites:
 *   get:
 *     summary: List all pending invites for the realm
 *     description: See https://github.com/essential-randomness/bobaserver/issues/56 for future design intentions to return all invites.
 *     operationId: getInvitesByRealmId
 *     tags:
 *       - /realms/
 *     security:
 *       - firebase: []
 *     parameters:
 *       - name: realm_id
 *         in: path
 *         description: The id of the realm.
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         examples:
 *           twisted_minds:
 *             summary: the twisted-minds realm id
 *             value: 76ef4cc3-1603-4278-95d7-99c59f481d2e
 *     responses:
 *       200:
 *         description: The metadata of all pending invites for the current realm.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 invites:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/InviteWithDetails"
 *             examples:
 *               twisted_minds:
 *                 value:
 *                   invites:
 *                     - realm_id: 76ef4cc3-1603-4278-95d7-99c59f481d2e
 *                       invite_url: https://twisted_minds.boba.social/invites/123invite_code456
 *                       invitee_email: ms.boba@bobaboard.com
 *                       own: false
 *                       issued_at: 2021-06-09T04:20:00Z
 *                       expires_at: 2021-06-09T16:20:00Z
 *                       label: This is a test invite.
 *       401:
 *         $ref: "#/components/responses/ensureLoggedIn401"
 *       403:
 *         $ref: "#/components/responses/ensurePermission403"
 *       404:
 *         description: The realm was not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/genericResponse"
 */

router.get(
  "/:realm_id/invites",
  ensureLoggedIn,
  ensureRealmPermission(RealmPermissions.createRealmInvite),
  async (req, res) => {
    const realm = req.currentRealmIds;
    const userId = req.currentUser.uid;
    const unformattedInvites = await getRealmInvites({
      realmStringId: realm.string_id,
    });
    if (!unformattedInvites.length) {
      res.status(200).json({ invites: [] });
      return;
    }
    const formattedInvites = unformattedInvites.map((invite) => {
      const formattedInvite = {
        realm_id: realm.string_id,
        invite_url: `https://${realm.slug}.boba.social/invites/${invite.nonce}`,
        invitee_email: invite.invitee_email,
        own: invite.inviter_id === userId ? true : false,
        issued_at: invite.created,
        expires_at: invite.expires_at,
        ...(invite.label && { label: invite.label }),
      };
      return formattedInvite;
    });
    log(formattedInvites);
    res.status(200).json({ invites: formattedInvites || [] });
  }
);

/**
 * @openapi
 * /realms/{realm_id}/invites/{nonce}:
 *   get:
 *     summary: Get an invite's realm and status.
 *     operationId: getInviteByNonce
 *     tags:
 *       - /realms/
 *     parameters:
 *       - name: realm_id
 *         in: path
 *         description: The id of the realm.
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         examples:
 *           twisted_minds:
 *             summary: the twisted-minds realm id
 *             value: 76ef4cc3-1603-4278-95d7-99c59f481d2e
 *       - name: nonce
 *         in: path
 *         description: The invite code.
 *         required: true
 *         schema:
 *           type: string
 *         examples:
 *           twisted_minds:
 *             summary: the invite code.
 *             value: 123invite_code456
 *     responses:
 *       200:
 *         description: The realm amd status of the requested invite.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/InviteStatus"
 *             examples:
 *               twisted_minds:
 *                 value:
 *                   realm_id: 76ef4cc3-1603-4278-95d7-99c59f481d2e
 *                   realm_slug: twisted-minds
 *                   invite_status: pending
 *       404:
 *         description: The invite with the given code was not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/genericResponse"
 */

router.get("/:realm_id/invites/:nonce", async (req, res) => {
  const nonce = req.params.nonce;
  const invite = await getInviteDetails({ nonce });
  if (!invite) {
    throw new NotFound404Error("The invite was not found");
  }
  const inviteRealm = await getRealmIdsByUuid({ realmId: invite.realmId });
  if (!inviteRealm) {
    throw new Internal500Error("failed to get realm ids");
  }
  res.status(200).json({
    realm_id: inviteRealm.string_id,
    realm_slug: inviteRealm.slug,
    invite_status: invite.expired
      ? "expired"
      : invite.used
      ? "used"
      : "pending",
  });
});

/**
 * @openapi
 * /realms/{realm_id}/invites:
 *   post:
 *     summary: Create invite for the realm.
 *     operationId: createInviteByRealmId
 *     tags:
 *       - /realms/
 *     security:
 *       - firebase: []
 *     parameters:
 *       - name: realm_id
 *         in: path
 *         description: The id of the realm.
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         examples:
 *           twisted_minds:
 *             summary: the twisted-minds realm id
 *             value: 76ef4cc3-1603-4278-95d7-99c59f481d2e
 *     requestBody:
 *       description: The invite data.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               label:
 *                 type: string
 *             required:
 *               - email
 *           examples:
 *             twisted_minds:
 *               value:
 *                 email: ms.boba@bobaboard.com
 *     responses:
 *       200:
 *         description: The invite metadata.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Invite"
 *             examples:
 *               twisted_minds:
 *                 value:
 *                   realm_id: 76ef4cc3-1603-4278-95d7-99c59f481d2e
 *                   invite_url: https://twisted_minds.boba.social/invites/123invite_code456
 *       400:
 *         description: The request does not contain required email.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/genericResponse"
 *       401:
 *         $ref: "#/components/responses/ensureLoggedIn401"
 *       403:
 *         $ref: "#/components/responses/ensurePermission403"
 *       404:
 *         description: The realm was not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/genericResponse"
 */
router.post(
  "/:realm_id/invites",
  ensureLoggedIn,
  ensureRealmPermission(RealmPermissions.createRealmInvite),
  async (req, res) => {
    const user = req.currentUser?.uid;
    const realmId = req.params.realm_id;
    const { email, label } = req.body;

    if (!email || !email.length) {
      res
        .status(400)
        .send({ message: "Request does not contain required email." });
      return;
    }
    // Generate 64 characters random id string
    const inviteCode = randomBytes(32).toString("hex");
    const adminId = await getUserFromFirebaseId({ firebaseId: user });
    log(adminId);

    const inviteAdded = await createInvite({
      realmId,
      email,
      inviteCode,
      inviterId: adminId.id,
      label,
    });

    if (!inviteAdded) {
      res.status(500).send(`Couldn't generate invite for email ${email}`);
    }
    const realm = req.currentRealmIds;
    log(realm);

    res.status(200).json({
      realm_id: realmId,
      invite_url: `https://${realm.slug}.boba.social/invites/${inviteCode}`,
    });
  }
);

/**
 * @openapi
 * /realms/{realm_id}/invites/{nonce}:
 *   post:
 *     summary: Accept invite for the realm.
 *     operationId: acceptInviteByNonce
 *     tags:
 *       - /realms/
 *     security:
 *       - firebase: []
 *       # Currently gated to logged-in only, uncomment if we decide not to separate out sign-up invites
 *       # - {}
 *     parameters:
 *       - name: realm_id
 *         in: path
 *         description: The id of the realm.
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         examples:
 *           twisted_minds:
 *             summary: the twisted-minds realm id
 *             value: 76ef4cc3-1603-4278-95d7-99c59f481d2e
 *       - name: nonce
 *         in: path
 *         description: The invite code.
 *         required: true
 *         schema:
 *           type: string
 *         examples:
 *           twisted_minds:
 *             summary: the invite code.
 *             value: 123invite_code456
 *     # Remove email and password requirements if we decide to separate out sign-up invites
 *     requestBody:
 *       description: The user data for the invite. Only required if the user is not already logged in.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *             required:
 *               - email
 *               - password
 *           examples:
 *             twisted_minds:
 *               value:
 *                 email: ms.boba@bobaboard.com
 *                 password: how_bad_can_i_be
 *     responses:
 *       200:
 *         description: The invite was successfully accepted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AcceptedInviteResponse"
 *             examples:
 *               twisted_minds:
 *                 value:
 *                   realm_id: 76ef4cc3-1603-4278-95d7-99c59f481d2e
 *                   realm_slug: twisted-minds
 *       403:
 *         description: The invite is not valid anymore, or is for a different realm, or does not correspond to the invited one.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/genericResponse"
 *       404:
 *         description: The invite with the given code was not found, or the requested realm does not exist.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/genericResponse"
 *       409:
 *         description: The user is already a member of the requested realm.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/genericResponse"
 */
router.post("/:realm_id/invites/:nonce", withLoggedIn, async (req, res) => {
  const { nonce } = req.params;
  const user = req.currentUser?.uid;

  // If we decide to separate out sign-up invites, this can be replaced with the currently commented out code below it.
  const getEmail = async (user?: string) => {
    if (!user) {
      return req.body.email;
    }
    try {
      const firebaseUserData = await firebaseAuth.auth().getUser(user);
      return firebaseUserData.email;
    } catch (e) {
      error(`Error while getting user email from firebase`);
      error(e);
      throw new Internal500Error(`Failed to get user's email`);
    }
  };
  const email = await getEmail(user);
  const { password } = req.body;
  // const firebaseUserData = await firebaseAuth.auth().getUser(user);
  // const email = firebaseUserData.email;
  // if (!email) {
  //   throw new Internal500Error(`Failed to get user's email`);
  // }

  const currentRealmIds = await getRealmIdsByUuid({
    realmId: req.params.realm_id,
  });
  if (!currentRealmIds) {
    throw new NotFound404Error(`The realm was not found`);
  }

  const inviteDetails = await getInviteDetails({ nonce });

  if (!inviteDetails) {
    throw new NotFound404Error(`Invite not found`);
  }

  if (inviteDetails.expired || inviteDetails.used) {
    throw new Forbidden403Error(`Invite expired or already used`);
  }

  if (inviteDetails.email.toLowerCase() != (email as string).toLowerCase()) {
    throw new Forbidden403Error(`Invite email does not match`);
  }

  const inviteRealm = await getRealmIdsByUuid({
    realmId: inviteDetails.realmId,
  });

  if (user) {
    const alreadyOnRealm = await checkUserOnRealm({
      user,
      realmStringId: inviteRealm.string_id,
    });
    if (alreadyOnRealm) {
      res
        .status(409)
        .send({ message: "User is already a member of the requested realm" });
      return;
    } else if (alreadyOnRealm !== false) {
      throw new Internal500Error(`Failed to check if user is already on realm`);
    }
  }

  const getUserId = async (user?: string) => {
    if (!!user) {
      return user;
    }
    // TODO: decide if sign-up invites should be separated off from Realm invites. If yes, move this.
    try {
      const newUser = await firebaseAuth.auth().createUser({
        email,
        password,
      });
      const uid = newUser.uid;
      log(`Created new firebase user with uid ${uid}`);
      const created = await createNewUser({
        firebaseId: uid,
        invitedBy: inviteDetails.inviter,
        createdOn: newUser.metadata.creationTime,
      });
      if (!created) {
        throw new Internal500Error(`Failed to create new user`);
      }
      return uid;
    } catch (error) {
      throw new Internal500Error(
        `Error creating user: ${error.message} (${error.code})`
      );
    }
  };

  const userId = await getUserId(user);

  const accepted = await acceptInvite({
    nonce,
    user: userId,
    realmStringId: inviteRealm.string_id,
  });
  if (!accepted) {
    throw new Internal500Error(`Failed to accept invite`);
  }
  res.status(200).json({
    realm_id: inviteRealm.string_id,
    realm_slug: inviteRealm.slug,
  });
});

export default router;
