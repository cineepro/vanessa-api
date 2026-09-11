// src/features/auth/services/authService.ts — Vanessa API Platform
//
// ⚠️ Reprend EXACTEMENT la même logique que ça-parle (même collection
// `users`, mêmes attributs à la création) — un compte créé ici doit
// pouvoir se connecter sur ça-parle, et inversement, sans aucune
// différence de structure.
import { account, databases } from '@/api/appwrite';
import { DATABASE_ID, COLLECTIONS } from '@/api/constants';
import { ID } from 'appwrite';

export const authService = {
    async register(name: string, email: string, password: string) {
        const user = await account.create(ID.unique(), email, password, name);
        await account.createEmailPasswordSession(email, password);
        await account.createVerification(`${window.location.origin}/email-confirmed`);

        await databases.createDocument(DATABASE_ID, COLLECTIONS.USERS, user.$id, {
            userId: user.$id,
            name,
            email,
            phone: '',
            avatarUrl: '',
            followers: 0,
            following: 0,
            isVerified: false,
            isCreative: false,
            balance: 0,
            bio: '',
            gossipLevel: 1,
            reputationScore: 0,
            reliabilityIndex: 50,
            storiesCount: 0,
            revelationsCount: 0,
            commentsCount: 0,
            predictionsCorrect: 0,
            predictionsTotal: 0,
            defaultAnonymous: false,
            isModerator: false,
            isBanned: false,
            newsletterOptOut: false,
            createdAt: new Date().toISOString(),
        });

        return user;
    },

    async login(email: string, password: string) {
        await account.createEmailPasswordSession(email, password);
        const user = await account.get();
        if (!user.emailVerification) {
            await account.deleteSession('current');
            throw new Error("Vérifie d'abord ton adresse email (lien envoyé à l'inscription) avant de te connecter.");
        }
        return user;
    },

    async logout() {
        await account.deleteSession('current');
    },

    async getCurrentUser() {
        return await account.get();
    },

    async getCurrentUserProfile(userId: string) {
        return await databases.getDocument(DATABASE_ID, COLLECTIONS.USERS, userId);
    },
};
