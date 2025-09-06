import { 
  users, faceImages, faceVideos, voiceRecordings, videoTemplates, processedVideos, processedVideoPeople, people, profiles, templates, voiceProfiles,
  animatedStories, userStorySessions,
  type User, type InsertUser, 
  type FaceImage, type InsertFaceImage,
  type FaceVideo, type InsertFaceVideo,
  type VoiceRecording, type InsertVoiceRecording,
  type VoiceProfile, type InsertVoiceProfile,
  type VideoTemplate, type InsertVideoTemplate,
  type ProcessedVideo, type InsertProcessedVideo,
  type ProcessedVideoPerson, type InsertProcessedVideoPerson,
  type Person, type InsertPerson,
  type Profile, type InsertProfile,
  type Template, type InsertTemplate,
  type AnimatedStory, type InsertAnimatedStory,
  type UserStorySession, type InsertUserStorySession,
  type PasswordResetToken, type InsertPasswordResetToken,
  passwordResetTokens
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from 'memorystore';
import { db, pool } from './db';

// Debug: Check database availability
console.log('🔍 DEBUG: Storage - db available:', !!db);
console.log('🔍 DEBUG: Storage - pool available:', !!pool);
import { eq, inArray, sql } from "drizzle-orm";
import connectPg from 'connect-pg-simple';
import { cache, CacheKeys, CacheTTL } from "./cache.js";
import { 
  encrypt, 
  decrypt, 
  storeSecureData, 
  retrieveSecureData, 
  cacheSet, 
  cacheGet, 
  cacheDelete, 
  cacheDeletePattern 
} from "./encryption";

// Storage interface for all CRUD operations
export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  updateUserSubscription(id: number, subscriptionStatus: string): Promise<User | undefined>;
  updateStripeInfo(id: number, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User | undefined>;
  
  // People operations
  getPerson(id: number): Promise<Person | undefined>;
  getPeopleByUserId(userId: number): Promise<Person[]>;
  getAllPeople(): Promise<Person[]>;
  createPerson(person: InsertPerson): Promise<Person>;
  updatePerson(id: number, person: Partial<InsertPerson>): Promise<Person | undefined>;
  deletePerson(id: number): Promise<boolean>;
  
  // Face image operations
  getFaceImage(id: number): Promise<FaceImage | undefined>;
  getFaceImagesByUserId(userId: number): Promise<FaceImage[]>;
  getFaceImagesByPersonId(personId: number): Promise<FaceImage[]>;
  createFaceImage(faceImage: InsertFaceImage): Promise<FaceImage>;
  deleteFaceImage(id: number): Promise<boolean>;
  setDefaultFaceImage(id: number): Promise<FaceImage | undefined>;
  
  // Face video operations
  getFaceVideo(id: number): Promise<FaceVideo | undefined>;
  getFaceVideosByUserId(userId: number): Promise<FaceVideo[]>;
  getFaceVideosByPersonId(personId: number): Promise<FaceVideo[]>;
  createFaceVideo(faceVideo: InsertFaceVideo): Promise<FaceVideo>;
  deleteFaceVideo(id: number): Promise<boolean>;
  updateFaceVideoProcessingStatus(id: number, status: string, extractedFacesCount?: number, errorMessage?: string): Promise<FaceVideo | undefined>;
  
  // Voice recording operations
  getVoiceRecording(id: number): Promise<VoiceRecording | undefined>;
  getVoiceRecordingsByUserId(userId: number): Promise<VoiceRecording[]>;
  getVoiceRecordingsByPersonId(personId: number): Promise<VoiceRecording[]>;
  createVoiceRecording(voiceRecording: InsertVoiceRecording): Promise<VoiceRecording>;
  deleteVoiceRecording(id: number): Promise<boolean>;
  setDefaultVoiceRecording(id: number): Promise<VoiceRecording | undefined>;

  // Voice profile operations
  getVoiceProfile(id: number): Promise<VoiceProfile | undefined>;
  getVoiceProfilesByUserId(userId: number): Promise<VoiceProfile[]>;
  getVoiceProfilesByPersonId(personId: number): Promise<VoiceProfile[]>;
  createVoiceProfile(voiceProfile: InsertVoiceProfile): Promise<VoiceProfile>;
  updateVoiceProfile(id: number, voiceProfile: Partial<InsertVoiceProfile>): Promise<VoiceProfile | undefined>;
  deleteVoiceProfile(id: number): Promise<boolean>;

  
  // Video template operations
  getVideoTemplate(id: number): Promise<VideoTemplate | undefined>;
  getAllVideoTemplates(): Promise<VideoTemplate[]>;
  getVideoTemplatesByCategory(category: string): Promise<VideoTemplate[]>;
  getVideoTemplatesByAgeRange(ageRange: string): Promise<VideoTemplate[]>;
  getFeaturedVideoTemplates(): Promise<VideoTemplate[]>;
  createVideoTemplate(videoTemplate: InsertVideoTemplate): Promise<VideoTemplate>;
  updateVideoTemplate(id: number, updateData: Partial<InsertVideoTemplate>): Promise<VideoTemplate | undefined>;
  deleteVideoTemplate(id: number): Promise<boolean>;
  
  // Processed video operations
  getProcessedVideo(id: number): Promise<ProcessedVideo | undefined>;
  getProcessedVideosByUserId(userId: number): Promise<ProcessedVideo[]>;
  createProcessedVideo(processedVideo: InsertProcessedVideo): Promise<ProcessedVideo>;
  updateProcessedVideoStatus(id: number, status: string, error?: string, outputUrl?: string): Promise<ProcessedVideo | undefined>;
  deleteProcessedVideo(id: number): Promise<boolean>;
  
  // Processed video people operations
  createProcessedVideoPerson(insertProcessedVideoPerson: InsertProcessedVideoPerson): Promise<ProcessedVideoPerson>;
  
  // Animated stories operations
  getAnimatedStory(id: number): Promise<AnimatedStory | undefined>;
  getAllAnimatedStories(): Promise<AnimatedStory[]>;
  getAnimatedStoriesByCategory(category: string): Promise<AnimatedStory[]>;
  getAnimatedStoriesByAgeRange(ageRange: string): Promise<AnimatedStory[]>;
  createAnimatedStory(story: InsertAnimatedStory): Promise<AnimatedStory>;
  updateAnimatedStory(id: number, updateData: Partial<InsertAnimatedStory>): Promise<AnimatedStory | undefined>;
  deleteAnimatedStory(id: number): Promise<boolean>;
  
  // User story sessions operations
  getUserStorySession(id: number): Promise<UserStorySession | undefined>;
  getUserStorySessionsByUserId(userId: number): Promise<UserStorySession[]>;
  getUserStorySessionsByStoryId(storyId: number): Promise<UserStorySession[]>;
  createUserStorySession(session: InsertUserStorySession): Promise<UserStorySession>;
  updateUserStorySession(id: number, updateData: Partial<InsertUserStorySession>): Promise<UserStorySession | undefined>;
  deleteUserStorySession(id: number): Promise<boolean>;

  // Password reset token operations
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | undefined>;
  getPasswordResetTokensByUserId(userId: number): Promise<PasswordResetToken[]>;
  markPasswordResetTokenUsed(token: string): Promise<boolean>;
  deleteExpiredPasswordResetTokens(): Promise<number>;
}

// New DatabaseStorage implementation with Drizzle ORM
export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    // Set up the session store with PostgreSQL
    const PostgresStore = connectPg(session);
    // Type assertion to suppress Pool type mismatch error
    this.sessionStore = new PostgresStore({
      pool: (pool ?? undefined) as any,
      tableName: 'session',
      createTableIfMissing: true
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const cacheKey = CacheKeys.user(id);
    const cached = cache.get<User>(cacheKey);
    if (cached) return cached;

    const [user] = await db!.select().from(users).where(eq(users.id, id));
    if (user) {
      cache.set(cacheKey, user, CacheTTL.MEDIUM);
    }
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db!.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db!.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db!.select().from(users).orderBy(users.username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db!
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const [user] = await db!
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserSubscription(id: number, subscriptionStatus: string): Promise<User | undefined> {
    const [user] = await db!
      .update(users)
      .set({ subscriptionStatus })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateStripeInfo(id: number, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User | undefined> {
    const updateData: Partial<User> = { stripeCustomerId };
    if (stripeSubscriptionId) {
      updateData.stripeSubscriptionId = stripeSubscriptionId;
    }
    const [user] = await db!
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // People operations
  async getPerson(id: number): Promise<Person | undefined> {
    const [person] = await db!.select().from(people).where(eq(people.id, id));
    return person;
  }

  async getPeopleByUserId(userId: number): Promise<Person[]> {
    const cacheKey = CacheKeys.userPeople(userId);
    const cached = cache.get<Person[]>(cacheKey);
    if (cached) return cached;

    const result = await db!.select().from(people).where(eq(people.userId, userId)).orderBy(people.name);
    cache.set(cacheKey, result, CacheTTL.MEDIUM);
    return result;
  }

  async getAllPeople(): Promise<Person[]> {
    const cacheKey = 'all_people';
    const cached = cache.get<Person[]>(cacheKey);
    if (cached) return cached;

    const result = await db!.select().from(people).orderBy(people.name);
    cache.set(cacheKey, result, CacheTTL.MEDIUM);
    return result;
  }

  async createPerson(insertPerson: InsertPerson): Promise<Person> {
    const [person] = await db!
      .insert(people)
      .values(insertPerson)
      .returning();
    cache.del(CacheKeys.userPeople(insertPerson.userId));
    return person;
  }

  async updatePerson(id: number, updateData: Partial<InsertPerson>): Promise<Person | undefined> {
    const [person] = await db!
      .update(people)
      .set(updateData)
      .where(eq(people.id, id))
      .returning();
    return person;
  }

  async deletePerson(id: number): Promise<boolean> {
    // Load person first to obtain userId for cache invalidation
    const [personRow] = await db!.select().from(people).where(eq(people.id, id));
    if (!personRow) return false;

    // Collect related resources first
    const personVoiceRecordings = await db!.select().from(voiceRecordings).where(eq(voiceRecordings.personId, id));
    const personFaceImages = await db!.select().from(faceImages).where(eq(faceImages.personId, id));
    const voiceRecordingIds = personVoiceRecordings.map(vr => vr.id);
    const faceImageIds = personFaceImages.map(fi => fi.id);

    // Remove processed videos that reference these assets
    if (voiceRecordingIds.length > 0) {
      await db!.delete(processedVideos).where(inArray(processedVideos.voiceRecordingId, voiceRecordingIds));
    }
    if (faceImageIds.length > 0) {
      await db!.delete(processedVideos).where(inArray(processedVideos.faceImageId, faceImageIds));
    }

    // Remove junction rows that directly reference the person
    await db!.delete(processedVideoPeople).where(eq(processedVideoPeople.personId, id));

    // Remove voice profiles for this person (FK may block deletion otherwise)
    await db!.delete(voiceProfiles).where(eq(voiceProfiles.personId, id));

    // Proactively delete child's rows in case database doesn't enforce ON DELETE CASCADE
    await db!.delete(voiceRecordings).where(eq(voiceRecordings.personId, id));
    await db!.delete(faceImages).where(eq(faceImages.personId, id));
    await db!.delete(faceVideos).where(eq(faceVideos.personId, id));

    // Finally remove the person
    await db!.delete(people).where(eq(people.id, id));

    // Invalidate caches so UI reflects deletion immediately
    try {
      cache.del(CacheKeys.userPeople(personRow.userId));
      cache.del('all_people');
      cache.del(CacheKeys.personFaceImages(id));
      cache.del(CacheKeys.personVoiceRecordings(id));
      cache.del(CacheKeys.personVoiceProfiles(id));
    } catch {}
    return true;
  }

  // Face image operations
  async getFaceImage(id: number): Promise<FaceImage | undefined> {
    const [faceImage] = await db!.select().from(faceImages).where(eq(faceImages.id, id));
    if (faceImage && faceImage.imageUrl) {
      try {
        const parsedData = JSON.parse(faceImage.imageUrl);
        if (parsedData.encrypted && parsedData.iv && parsedData.authTag) {
          const decryptedImage = await retrieveSecureData(
            parsedData,
            `cache:face_image:${faceImage.personId}:${faceImage.id}`
          );
          if (decryptedImage) {
            faceImage.imageUrl = decryptedImage as string;
          }
        }
      } catch (error) {
        // Data is not encrypted, continue with original
      }
    }
    return faceImage;
  }

  async getFaceImagesByUserId(userId: number): Promise<FaceImage[]> {
    return await db!.select().from(faceImages).where(eq(faceImages.userId, userId));
  }

  async getFaceImagesByPersonId(personId: number): Promise<FaceImage[]> {
    const cacheKey = CacheKeys.personFaceImages(personId);
    const cached = cache.get<FaceImage[]>(cacheKey);
    if (cached) return cached;
    const result = await db!.select({
      id: faceImages.id,
      userId: faceImages.userId,
      personId: faceImages.personId,
      name: faceImages.name,
      isDefault: faceImages.isDefault,
      mlProcessed: faceImages.mlProcessed,
      sourceVideoId: faceImages.sourceVideoId,
      expressionType: faceImages.expressionType,
      createdAt: faceImages.createdAt,
      // Exclude large fields to prevent memory issues. Fetch them individually.
      imageUrl: sql<string>`''`,
      imageData: sql<string>`''`,
      faceEmbedding: sql`'{}'::jsonb`
    }).from(faceImages).where(eq(faceImages.personId, personId));
    cache.set(cacheKey, result, CacheTTL.SHORT);
    return result;
  }

  async createFaceImage(insertFaceImage: InsertFaceImage): Promise<FaceImage> {
    if (insertFaceImage.isDefault) {
      await db!
        .update(faceImages)
        .set({ isDefault: false })
        .where(eq(faceImages.personId, insertFaceImage.personId));
    }
    let processedFaceImage = { ...insertFaceImage };
    if (insertFaceImage.imageUrl && insertFaceImage.imageUrl.startsWith('data:image/')) {
      try {
        const encryptedData = await storeSecureData(
          `faceImage:${Date.now()}`,
          insertFaceImage.imageUrl,
          `cache:face_image:${insertFaceImage.personId}:${Date.now()}`
        );
        processedFaceImage.imageUrl = JSON.stringify(encryptedData);
        console.log('Face image data encrypted successfully');
      } catch (error) {
        console.error('Face image encryption failed:', error);
      }
    }
    const [faceImage] = await db!
      .insert(faceImages)
      .values(processedFaceImage)
      .returning();
    cache.del(CacheKeys.personFaceImages(insertFaceImage.personId));
    return faceImage;
  }

  async setDefaultFaceImage(id: number): Promise<FaceImage | undefined> {
    const [faceImage] = await db!.select().from(faceImages).where(eq(faceImages.id, id));
    if (!faceImage) return undefined;
    await db!
      .update(faceImages)
      .set({ isDefault: false })
      .where(eq(faceImages.personId, faceImage.personId));
    const [updatedFaceImage] = await db!
      .update(faceImages)
      .set({ isDefault: true })
      .where(eq(faceImages.id, id))
      .returning();
    return updatedFaceImage;
  }

  async deleteFaceImage(id: number): Promise<boolean> {
    await db!.delete(faceImages).where(eq(faceImages.id, id));
    return true;
  }

  // Face video operations
  async getFaceVideo(id: number): Promise<FaceVideo | undefined> {
    const [faceVideo] = await db!.select().from(faceVideos).where(eq(faceVideos.id, id));
    return faceVideo;
  }

  async getFaceVideosByUserId(userId: number): Promise<FaceVideo[]> {
    return await db!.select().from(faceVideos).where(eq(faceVideos.userId, userId));
  }

  async getFaceVideosByPersonId(personId: number): Promise<FaceVideo[]> {
    return await db!.select().from(faceVideos).where(eq(faceVideos.personId, personId));
  }

  async createFaceVideo(insertFaceVideo: InsertFaceVideo): Promise<FaceVideo> {
    const [faceVideo] = await db!
      .insert(faceVideos)
      .values(insertFaceVideo)
      .returning();
    return faceVideo;
  }

  async updateFaceVideoProcessingStatus(
    id: number,
    status: string,
    extractedFacesCount?: number,
    errorMessage?: string
  ): Promise<FaceVideo | undefined> {
    const updateData: Partial<FaceVideo> = {
      processingStatus: status,
      isProcessed: status === 'completed'
    };
    if (extractedFacesCount !== undefined) {
      updateData.extractedFacesCount = extractedFacesCount;
    }
    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }
    const [updatedFaceVideo] = await db!
      .update(faceVideos)
      .set(updateData)
      .where(eq(faceVideos.id, id))
      .returning();
    return updatedFaceVideo;
  }

  async deleteFaceVideo(id: number): Promise<boolean> {
    await db!.delete(faceVideos).where(eq(faceVideos.id, id));
    return true;
  }

  // Voice recording operations
  async getVoiceRecording(id: number): Promise<VoiceRecording | undefined> {
    const [voiceRecording] = await db!.select().from(voiceRecordings).where(eq(voiceRecordings.id, id));
    if (voiceRecording && voiceRecording.audioUrl) {
      try {
        const parsedData = JSON.parse(voiceRecording.audioUrl);
        if (parsedData.encrypted && parsedData.iv && parsedData.authTag) {
          const decryptedAudio = await retrieveSecureData(
            parsedData,
            `cache:voice_recording:${voiceRecording.personId}:${voiceRecording.id}`
          );
          if (decryptedAudio) {
            voiceRecording.audioUrl = decryptedAudio as string;
          }
        }
      } catch (error) {
        // Data is not encrypted, continue with original
      }
    }
    return voiceRecording;
  }

  async getVoiceRecordingsByUserId(userId: number): Promise<VoiceRecording[]> {
    return await db!.select().from(voiceRecordings).where(eq(voiceRecordings.userId, userId));
  }

  async getVoiceRecordingsByPersonId(personId: number): Promise<VoiceRecording[]> {
    const cacheKey = CacheKeys.personVoiceRecordings(personId);
    const cached = cache.get<VoiceRecording[]>(cacheKey);
    if (cached) return cached;
    const result = await db!.select().from(voiceRecordings).where(eq(voiceRecordings.personId, personId));
    cache.set(cacheKey, result, CacheTTL.SHORT);
    return result;
  }

  async createVoiceRecording(insertVoiceRecording: InsertVoiceRecording): Promise<VoiceRecording> {
    if (insertVoiceRecording.isDefault) {
      await db!
        .update(voiceRecordings)
        .set({ isDefault: false })
        .where(eq(voiceRecordings.personId, insertVoiceRecording.personId));
    }
    let processedVoiceRecording = { ...insertVoiceRecording };
    if (insertVoiceRecording.audioUrl && insertVoiceRecording.audioUrl.startsWith('data:audio/')) {
      try {
        const encryptedData = await storeSecureData(
          `voiceRecording:${Date.now()}`,
          insertVoiceRecording.audioUrl,
          `cache:voice_recording:${insertVoiceRecording.personId}:${Date.now()}`
        );
        processedVoiceRecording.audioUrl = JSON.stringify(encryptedData);
        console.log('Voice recording data encrypted successfully');
      } catch (error) {
        console.error('Voice recording encryption failed:', error);
      }
    }
    const [voiceRecording] = await db!
      .insert(voiceRecordings)
      .values(processedVoiceRecording)
      .returning();
    cache.del(CacheKeys.personVoiceRecordings(insertVoiceRecording.personId));
    return voiceRecording;
  }

  async updateVoiceRecording(id: number, update: Partial<VoiceRecording>): Promise<VoiceRecording | undefined> {
    const [row] = await db!
      .update(voiceRecordings)
      .set(update as any)
      .where(eq(voiceRecordings.id, id))
      .returning();
    return row;
  }

  async setDefaultVoiceRecording(id: number): Promise<VoiceRecording | undefined> {
    const [voiceRecording] = await db!.select().from(voiceRecordings).where(eq(voiceRecordings.id, id));
    if (!voiceRecording) return undefined;
    await db!
      .update(voiceRecordings)
      .set({ isDefault: false })
      .where(eq(voiceRecordings.personId, voiceRecording.personId));
    const [updatedVoiceRecording] = await db!
      .update(voiceRecordings)
      .set({ isDefault: true })
      .where(eq(voiceRecordings.id, id))
      .returning();
    return updatedVoiceRecording;
  }

  async deleteVoiceRecording(id: number): Promise<boolean> {
    await db!.delete(voiceRecordings).where(eq(voiceRecordings.id, id));
    return true;
  }

  // Voice profile operations
  async getVoiceProfile(id: number): Promise<VoiceProfile | undefined> {
    const [profile] = await db!.select().from(voiceProfiles).where(eq(voiceProfiles.id, id));
    return profile;
  }

  async getVoiceProfilesByUserId(userId: number): Promise<VoiceProfile[]> {
    const cacheKey = CacheKeys.userVoiceProfiles(userId);
    const cached = cache.get<VoiceProfile[]>(cacheKey);
    if (cached) return cached;
    const result = await db!.select().from(voiceProfiles).where(eq(voiceProfiles.userId, userId));
    cache.set(cacheKey, result, CacheTTL.MEDIUM);
    return result;
  }

  async getVoiceProfilesByPersonId(personId: number): Promise<VoiceProfile[]> {
    const cacheKey = CacheKeys.personVoiceProfiles(personId);
    const cached = cache.get<VoiceProfile[]>(cacheKey);
    if (cached) return cached;
    const result = await db!.select().from(voiceProfiles).where(eq(voiceProfiles.personId, personId));
    cache.set(cacheKey, result, CacheTTL.MEDIUM);
    return result;
  }

  async createVoiceProfile(insertVoiceProfile: InsertVoiceProfile): Promise<VoiceProfile> {
    const [profile] = await db!
      .insert(voiceProfiles)
      .values(insertVoiceProfile)
      .returning();
    cache.del(CacheKeys.userVoiceProfiles(insertVoiceProfile.userId));
    cache.del(CacheKeys.personVoiceProfiles(insertVoiceProfile.personId));
    return profile;
  }

  async updateVoiceProfile(id: number, updateData: Partial<InsertVoiceProfile>): Promise<VoiceProfile | undefined> {
    const [profile] = await db!
      .update(voiceProfiles)
      .set(updateData)
      .where(eq(voiceProfiles.id, id))
      .returning();
    if (profile) {
      cache.del(CacheKeys.userVoiceProfiles(profile.userId));
      cache.del(CacheKeys.personVoiceProfiles(profile.personId));
    }
    return profile;
  }

  async deleteVoiceProfile(id: number): Promise<boolean> {
    const [profile] = await db!.select().from(voiceProfiles).where(eq(voiceProfiles.id, id));
    if (profile) {
        await db!.delete(voiceProfiles).where(eq(voiceProfiles.id, id));
        cache.del(CacheKeys.userVoiceProfiles(profile.userId));
        cache.del(CacheKeys.personVoiceProfiles(profile.personId));
        return true;
    }
    return false;
  }

  // Video template operations
  async getVideoTemplate(id: number): Promise<VideoTemplate | undefined> {
    const [videoTemplate] = await db!.select().from(videoTemplates).where(eq(videoTemplates.id, id));
    return videoTemplate;
  }

  async getAllVideoTemplates(): Promise<VideoTemplate[]> {
    const cacheKey = CacheKeys.videoTemplates();
    const cached = cache.get<VideoTemplate[]>(cacheKey);
    if (cached) return cached;
    const result = await db!.select().from(videoTemplates);
    cache.set(cacheKey, result, CacheTTL.LONG);
    return result;
  }

  async getVideoTemplatesByCategory(category: string): Promise<VideoTemplate[]> {
    return await db!.select().from(videoTemplates).where(eq(videoTemplates.category, category));
  }

  async getVideoTemplatesByAgeRange(ageRange: string): Promise<VideoTemplate[]> {
    return await db!.select().from(videoTemplates).where(eq(videoTemplates.ageRange, ageRange));
  }

  async getFeaturedVideoTemplates(): Promise<VideoTemplate[]> {
    const cacheKey = CacheKeys.videoTemplatesFeatured();
    const cached = cache.get<VideoTemplate[]>(cacheKey);
    if (cached) return cached;
    const result = await db!.select().from(videoTemplates).where(eq(videoTemplates.featured, true));
    cache.set(cacheKey, result, CacheTTL.LONG);
    return result;
  }

  async createVideoTemplate(insertVideoTemplate: InsertVideoTemplate): Promise<VideoTemplate> {
    const [videoTemplate] = await db!
      .insert(videoTemplates)
      .values(insertVideoTemplate)
      .returning();
    return videoTemplate;
  }

  async updateVideoTemplate(id: number, updateData: Partial<InsertVideoTemplate>): Promise<VideoTemplate | undefined> {
    const [videoTemplate] = await db!
      .update(videoTemplates)
      .set(updateData)
      .where(eq(videoTemplates.id, id))
      .returning();
    return videoTemplate;
  }

  async deleteVideoTemplate(id: number): Promise<boolean> {
    await db!.delete(videoTemplates).where(eq(videoTemplates.id, id));
    return true;
  }

  // Processed video operations
  async getProcessedVideo(id: number): Promise<ProcessedVideo | undefined> {
    const [processedVideo] = await db!.select().from(processedVideos).where(eq(processedVideos.id, id));
    return processedVideo;
  }

  async getProcessedVideosByUserId(userId: number): Promise<ProcessedVideo[]> {
    return await db!.select().from(processedVideos).where(eq(processedVideos.userId, userId));
  }

  async createProcessedVideo(insertProcessedVideo: InsertProcessedVideo): Promise<ProcessedVideo> {
    const [processedVideo] = await db!
      .insert(processedVideos)
      .values(insertProcessedVideo)
      .returning();
    return processedVideo;
  }

  async updateProcessedVideoStatus(id: number, status: string, error?: string, outputUrl?: string): Promise<ProcessedVideo | undefined> {
    const updateData: Partial<ProcessedVideo> = { status };
    if (error) {
      updateData.error = error;
    }
    if (outputUrl) {
      updateData.outputUrl = outputUrl;
    }
    const [processedVideo] = await db!
      .update(processedVideos)
      .set(updateData)
      .where(eq(processedVideos.id, id))
      .returning();
    return processedVideo;
  }

  async deleteProcessedVideo(id: number): Promise<boolean> {
    await db!.delete(processedVideos).where(eq(processedVideos.id, id));
    return true;
  }

  // Processed video people operations
  async createProcessedVideoPerson(insertProcessedVideoPerson: InsertProcessedVideoPerson): Promise<ProcessedVideoPerson> {
    const [processedVideoPerson] = await db!
      .insert(processedVideoPeople)
      .values(insertProcessedVideoPerson)
      .returning();
    return processedVideoPerson;
  }

  // Animated stories operations
  async getAnimatedStory(id: number): Promise<AnimatedStory | undefined> {
    const [story] = await db!.select().from(animatedStories).where(eq(animatedStories.id, id));
    return story;
  }

  async getAllAnimatedStories(): Promise<AnimatedStory[]> {
    return await db!.select().from(animatedStories).orderBy(animatedStories.createdAt);
  }

  async getAnimatedStoriesByCategory(category: string): Promise<AnimatedStory[]> {
    return await db!.select().from(animatedStories).where(eq(animatedStories.category, category));
  }

  async getAnimatedStoriesByAgeRange(ageRange: string): Promise<AnimatedStory[]> {
    return await db!.select().from(animatedStories).where(eq(animatedStories.ageRange, ageRange));
  }

  async createAnimatedStory(story: InsertAnimatedStory): Promise<AnimatedStory> {
    const [newStory] = await db!
      .insert(animatedStories)
      .values(story)
      .returning();
    return newStory;
  }

  async updateAnimatedStory(id: number, updateData: Partial<InsertAnimatedStory>): Promise<AnimatedStory | undefined> {
    const [story] = await db!
      .update(animatedStories)
      .set(updateData)
      .where(eq(animatedStories.id, id))
      .returning();
    return story;
  }

  async deleteAnimatedStory(id: number): Promise<boolean> {
    await db!.delete(animatedStories).where(eq(animatedStories.id, id));
    return true;
  }

  // User story sessions operations
  async getUserStorySession(id: number): Promise<UserStorySession | undefined> {
    const [session] = await db!.select().from(userStorySessions).where(eq(userStorySessions.id, id));
    return session;
  }

  async getUserStorySessionsByUserId(userId: number): Promise<UserStorySession[]> {
    return await db!.select().from(userStorySessions).where(eq(userStorySessions.userId, userId));
  }

  async getUserStorySessionsByStoryId(storyId: number): Promise<UserStorySession[]> {
    return await db!.select().from(userStorySessions).where(eq(userStorySessions.storyId, storyId));
  }

  async createUserStorySession(session: InsertUserStorySession): Promise<UserStorySession> {
    const [newSession] = await db!
      .insert(userStorySessions)
      .values(session)
      .returning();
    return newSession;
  }

  async updateUserStorySession(id: number, updateData: Partial<InsertUserStorySession>): Promise<UserStorySession | undefined> {
    const [session] = await db!
      .update(userStorySessions)
      .set(updateData)
      .where(eq(userStorySessions.id, id))
      .returning();
    return session;
  }

  async deleteUserStorySession(id: number): Promise<boolean> {
    await db!.delete(userStorySessions).where(eq(userStorySessions.id, id));
    return true;
  }

  // Password reset token operations
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [row] = await db!.insert(passwordResetTokens).values(token).returning();
    return row;
  }
  async getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | undefined> {
    const [row] = await db!.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return row;
  }
  async getPasswordResetTokensByUserId(userId: number): Promise<PasswordResetToken[]> {
    return await db!.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  }
  async markPasswordResetTokenUsed(token: string): Promise<boolean> {
    const [row] = await db!.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.token, token)).returning();
    return !!row;
  }
  async deleteExpiredPasswordResetTokens(): Promise<number> {
    const now = new Date();
    const result = await db!.delete(passwordResetTokens).where(sql`${passwordResetTokens.expiresAt} < ${now}`);
    return result.rowCount || 0;
  }
}

// In-memory fallback storage for environments without a database
class MemoryStorage implements IStorage {
  public sessionStore: session.Store;
  private usersMap: Map<number, User> = new Map();
  private usernameIndex: Map<string, number> = new Map();
  private emailIndex: Map<string, number> = new Map();
  private idCounter = 1;

  constructor() {
    const MemoryStoreCtor = createMemoryStore(session);
    this.sessionStore = new MemoryStoreCtor({ checkPeriod: 86400000 });

    // Seed default admin from env or defaults
    const username = process.env.ADMIN_USERNAME || 'admin';
    const email = process.env.ADMIN_EMAIL || 'admin@famflix.com';
    const user: any = {
      id: this.idCounter++,
      username,
      email,
      displayName: 'Administrator',
      role: 'admin',
      subscriptionStatus: 'active',
      password: process.env.ADMIN_PASSWORD_HASH || '$2a$10$7GCK1i2Hj7zqT2XnH0oB3e8N8m3tGkXv6W7f6a0s9eJk2L8qT0t9S' // bcrypt hash placeholder
    };
    this.usersMap.set(user.id, user);
    this.usernameIndex.set(user.username, user.id);
    this.emailIndex.set(user.email, user.id);
  }

  async getUser(id: number) { return this.usersMap.get(id); }
  async getUserByUsername(username: string) {
    const id = this.usernameIndex.get(username);
    return id ? this.usersMap.get(id) : undefined;
  }
  async getUserByEmail(email: string) {
    const id = this.emailIndex.get(email);
    return id ? this.usersMap.get(id) : undefined;
  }
  async getAllUsers() { return Array.from(this.usersMap.values()); }
  async createUser(user: InsertUser) {
    const newUser: any = { ...user, id: this.idCounter++ };
    this.usersMap.set(newUser.id, newUser);
    this.usernameIndex.set(newUser.username, newUser.id);
    this.emailIndex.set(newUser.email, newUser.id);
    return newUser as User;
  }
  async updateUserRole(id: number, role: string) { const u = this.usersMap.get(id); if (!u) return undefined as any; (u as any).role = role; return u; }
  async updateUserSubscription(id: number, subscriptionStatus: string) { const u = this.usersMap.get(id); if (!u) return undefined as any; (u as any).subscriptionStatus = subscriptionStatus; return u; }
  async updateStripeInfo(id: number, stripeCustomerId: string, stripeSubscriptionId?: string) { const u = this.usersMap.get(id); if (!u) return undefined as any; (u as any).stripeCustomerId = stripeCustomerId; if (stripeSubscriptionId) (u as any).stripeSubscriptionId = stripeSubscriptionId; return u; }

  async getPerson(id: number) { return undefined as any; }
  async getPeopleByUserId(userId: number) { return [] as any; }
  async getAllPeople() { return [] as any; }
  async createPerson(person: InsertPerson) { return { ...person, id: 1 } as any; }
  async updatePerson(id: number, person: Partial<InsertPerson>) { return undefined as any; }
  async deletePerson(id: number) { return true; }

  async getFaceImage(id: number) { return undefined as any; }
  async getFaceImagesByUserId(userId: number) { return [] as any; }
  async getFaceImagesByPersonId(personId: number) { return [] as any; }
  async createFaceImage(faceImage: InsertFaceImage) { return { ...faceImage, id: 1 } as any; }
  async deleteFaceImage(id: number) { return true; }
  async setDefaultFaceImage(id: number) { return undefined as any; }

  async getFaceVideo(id: number) { return undefined as any; }
  async getFaceVideosByUserId(userId: number) { return [] as any; }
  async getFaceVideosByPersonId(personId: number) { return [] as any; }
  async createFaceVideo(faceVideo: InsertFaceVideo) { return { ...faceVideo, id: 1 } as any; }
  async deleteFaceVideo(id: number) { return true; }
  async updateFaceVideoProcessingStatus(id: number, status: string) { return undefined as any; }

  async getVoiceRecording(id: number) { return undefined as any; }
  async getVoiceRecordingsByUserId(userId: number) { return [] as any; }
  async getVoiceRecordingsByPersonId(personId: number) { return [] as any; }
  async createVoiceRecording(voiceRecording: InsertVoiceRecording) { return { ...voiceRecording, id: 1 } as any; }
  async deleteVoiceRecording(id: number) { return true; }
  async setDefaultVoiceRecording(id: number) { return undefined as any; }

  async getVoiceProfile(id: number) { return undefined as any; }
  async getVoiceProfilesByUserId(userId: number) { return [] as any; }
  async getVoiceProfilesByPersonId(personId: number) { return [] as any; }
  async createVoiceProfile(voiceProfile: InsertVoiceProfile) { return { ...voiceProfile, id: 1 } as any; }
  async updateVoiceProfile(id: number, voiceProfile: Partial<InsertVoiceProfile>) { return undefined as any; }
  async deleteVoiceProfile(id: number) { return true; }

  async getVideoTemplate(id: number) { return undefined as any; }
  async getAllVideoTemplates() { return [] as any; }
  async getVideoTemplatesByCategory(category: string) { return [] as any; }
  async getVideoTemplatesByAgeRange(ageRange: string) { return [] as any; }
  async getFeaturedVideoTemplates() { return [] as any; }
  async createVideoTemplate(videoTemplate: InsertVideoTemplate) { return { ...videoTemplate, id: 1 } as any; }
  async updateVideoTemplate(id: number, updateData: Partial<InsertVideoTemplate>) { return undefined as any; }
  async deleteVideoTemplate(id: number) { return true; }

  async getProcessedVideo(id: number) { return undefined as any; }
  async getProcessedVideosByUserId(userId: number) { return [] as any; }
  async createProcessedVideo(processedVideo: InsertProcessedVideo) { return { ...processedVideo, id: 1 } as any; }
  async updateProcessedVideoStatus(id: number, status: string) { return undefined as any; }
  async deleteProcessedVideo(id: number) { return true; }

  async createProcessedVideoPerson(insertProcessedVideoPerson: InsertProcessedVideoPerson) { return { ...insertProcessedVideoPerson, id: 1 } as any; }

  async getAnimatedStory(id: number) { return undefined as any; }
  async getAllAnimatedStories() { return [] as any; }
  async getAnimatedStoriesByCategory(category: string) { return [] as any; }
  async getAnimatedStoriesByAgeRange(ageRange: string) { return [] as any; }
  async createAnimatedStory(story: InsertAnimatedStory) { return { ...story, id: 1 } as any; }
  async updateAnimatedStory(id: number, updateData: Partial<InsertAnimatedStory>) { return undefined as any; }
  async deleteAnimatedStory(id: number) { return true; }

  async getUserStorySession(id: number) { return undefined as any; }
  async getUserStorySessionsByUserId(userId: number) { return [] as any; }
  async getUserStorySessionsByStoryId(storyId: number) { return [] as any; }
  async createUserStorySession(session: InsertUserStorySession) { return { ...session, id: 1 } as any; }
  async updateUserStorySession(id: number, updateData: Partial<InsertUserStorySession>) { return undefined as any; }
  async deleteUserStorySession(id: number) { return true; }

  async createPasswordResetToken(token: InsertPasswordResetToken) { return { ...token, id: 1 } as any; }
  async getPasswordResetTokenByToken(token: string) { return undefined as any; }
  async getPasswordResetTokensByUserId(userId: number) { return [] as any; }
  async markPasswordResetTokenUsed(token: string) { return true; }
  async deleteExpiredPasswordResetTokens() { return 0; }
}

// Lazy storage initialization - check database availability at runtime
let _storage: IStorage | null = null;

function initializeStorage(): IStorage {
  if (_storage === null) {
    // Re-check database availability at runtime
    console.log('🔍 DEBUG: Runtime storage init - db available:', !!db);
    console.log('🔍 DEBUG: Runtime storage init - pool available:', !!pool);
    _storage = (pool && db) ? new DatabaseStorage() : new MemoryStorage();
    console.log('🔍 DEBUG: Using storage type:', _storage.constructor.name);
  }
  return _storage;
}

// Create a proxy object that initializes storage on first property access
export const storage = new Proxy({} as IStorage, {
  get(target, prop) {
    const storageInstance = initializeStorage();
    return (storageInstance as any)[prop];
  }
});