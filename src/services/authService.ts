import UserController from '../Controller/userController';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import TenantUserController from '../Controller/tenantUserController';
import MongooseController from '../Controller/mongooseController';
import { getConfig } from '../config';
import TenantService from './tenantService';
import TenantController from '../Controller/tenantController';
import moment from 'moment';

const BCRYPT_SALT_ROUNDS = 12;

class AuthService {

  static async signup(
    email,
    password,
    invitationToken,
    tenantId,
    options: any = {},
  ) {
    
    const session = await MongooseController.createSession(
      options.database,
      );
      
    try {
      email = email.toLowerCase();
      
      const existingUser = await UserController.findByEmail(
        email,
        options,
      );

      // Generates a hashed password to hide the original one.
      const hashedPassword = await bcrypt.hash(
        password,
        BCRYPT_SALT_ROUNDS,
      );

      // The user may already exist on the database in case it was invided.
      if (existingUser) {
        // If the user already have an password,
        // it means that it has already signed up
        const existingPassword = await UserController.findPassword(
          existingUser.id,
          options,
        );

        if (existingPassword) {
          throw new Error("email Already In Use");
        }

        /**
         * In the case of the user exists on the database (was invited)
         * it only creates the new password
         */
        await UserController.updatePassword(
          existingUser.id,
          hashedPassword,
          false,
          {
            ...options,
            session,
            bypassPermissionValidation: true,
          },
        );

        // Handles onboarding process like
        // invitation, creation of default tenant,
        // or default joining the current tenant
        await this.handleOnboard(
          existingUser,
          invitationToken,
          tenantId,
          {
            ...options,
            session,
          },
        );

        // Email may have been alreadyverified using the invitation token
       /* const isEmailVerified = Boolean(
          await UserController.count(
            {
              emailVerified: true,
              _id: existingUser.id,
            },
            {
              ...options,
              session,
            },
          ),
        );

        if (!isEmailVerified) {
          await this.sendEmailAddressVerificationEmail(
            options.language,
            existingUser.email,
            tenantId,
            {
              ...options,
              session,
              bypassPermissionValidation: true,
            },
          );
        }*/

        const token = jwt.sign(
          { id: existingUser.id },
          getConfig().AUTH_JWT_SECRET,
          { expiresIn: getConfig().AUTH_JWT_EXPIRES_IN },
        );

        await MongooseController.commitTransaction(session);

        return token;
      }

      const newUser = await UserController.createFromAuth(
        {
          firstName: email.split('@')[0],
          password: hashedPassword,
          email: email,
        },
        {
          ...options,
          session,
        },
      );

      // Handles onboarding process like
      // invitation, creation of default tenant,
      // or default joining the current tenant
      await this.handleOnboard(
        newUser,
        invitationToken,
        tenantId,
        {
          ...options,
          session,
        },
      );

      // Email may have been alreadyverified using the invitation token
      const isEmailVerified = Boolean(
        await UserController.count(
          {
            emailVerified: true,
            _id: newUser.id,
          },
          {
            ...options,
            session,
          },
        ),
      );
      const token = jwt.sign(
        { id: newUser.id },
        getConfig().AUTH_JWT_SECRET,
        { expiresIn: getConfig().AUTH_JWT_EXPIRES_IN },
      );

      await MongooseController.commitTransaction(session);

      return token;
    } catch (error) {
      await MongooseController.abortTransaction(session);

      throw error;
    }
  }

  static async findByEmail(email, options: any = {}) {
    email = email.toLowerCase();
    return UserController.findByEmail(email, options);
  }

  static async signin(
    email,
    password,
    invitationToken,
    tenantId,
    options: any = {},
  ) {
    const session = await MongooseController.createSession(
      options.database,
    );

    try {
      email = email.toLowerCase();
      const user = await UserController.findByEmail(
        email,
        options,
      );

      if (!user) {
        throw new Error("user not found");
      }

      const currentPassword = await UserController.findPassword(
        user.id,
        options,
      );

      if (!currentPassword) {
        throw new Error("wrong Password");
      }

      const passwordsMatch = await bcrypt.compare(
        password,
        currentPassword,
      );

      if (!passwordsMatch) {
        throw new Error("wrongPassword");
      }

      // Handles onboarding process like
      // invitation, creation of default tenant,
      // or default joining the current tenant
      await this.handleOnboard(
        user,
        invitationToken,
        tenantId,
        {
          ...options,
          currentUser: user,
          session,
        },
      );

      const token = jwt.sign(
        { id: user.id },
        getConfig().AUTH_JWT_SECRET,
        { expiresIn: getConfig().AUTH_JWT_EXPIRES_IN },
      );

      await MongooseController.commitTransaction(session);

      return token;
    } catch (error) {
      await MongooseController.abortTransaction(session);

      throw error;
    }
  }

  static async handleOnboard(
    currentUser,
    invitationToken,
    tenantId,
    options,
  ) {
    if (invitationToken) {
      try {
        await TenantUserController.acceptInvitation(
          invitationToken,
          {
            ...options,
            currentUser,
            bypassPermissionValidation: true,
          },
        );
      } catch (error) {
        console.error(error);
        // In case of invitation acceptance error, does not prevent
        // the user from sign up/in
      }
    }

    const singleTenant =
      getConfig().TENANT_MODE === 'single';

    if (singleTenant) {
      // In case is single tenant, and the user is signing in
      // with an invited email and for some reason doesn't have the token
      // it auto-assigns it
      await new TenantService({
        ...options,
        currentUser,
      }).joinDefaultUsingInvitedEmail(options.session);

      // Creates or join default Tenant
      await new TenantService({
        ...options,
        currentUser,
      }).createOrJoinDefault(
        {
          // leave empty to require admin's approval
          roles: [],
        },
        options.session,
      );
    }
  }

  static async findByToken(token, options) {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getConfig().AUTH_JWT_SECRET,
        (err, decoded) => {
          if (err) {
            reject(err);
            return;
          }

          const id = decoded.id;
          const jwtTokenIat = decoded.iat;

          UserController.findById(id, {
            ...options,
            bypassPermissionValidation: true,
          })
            .then((user) => {
              const isTokenManuallyExpired =
                user &&
                user.jwtTokenInvalidBefore &&
                moment
                  .unix(jwtTokenIat)
                  .isBefore(
                    moment(user.jwtTokenInvalidBefore),
                  );

              if (isTokenManuallyExpired) {
                reject(new Error());
                return;
              }

              // If the email sender id not configured,
              // removes the need for email verification.
              if (user) {
                user.emailVerified = true;
              }

              resolve(user);
            })
            .catch((error) => reject(error));
        },
      );
    });
  }
}

export default AuthService;
