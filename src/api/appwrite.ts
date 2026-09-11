// src/api/appwrite.ts — Vanessa API Platform
import { Client, Account, Databases, Functions } from 'appwrite';

export const appwriteConfig = {
    endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT,
    projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
};

const endpoint = appwriteConfig.endpoint;
const projectId = appwriteConfig.projectId;

if (!projectId) {
    throw new Error('VITE_APPWRITE_PROJECT_ID est manquant dans le .env (doit être le MÊME projet que ça-parle, pour un compte utilisateur partagé).');
}

export const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);

export default client;
