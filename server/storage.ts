import { 
  users, faceImages, faceVideos, voiceRecordings, videoTemplates, processedVideos, processedVideoPeople, people, profiles, templates,
  type User, type InsertUser, 
  type FaceImage, type InsertFaceImage,
  type FaceVideo, type InsertFaceVideo,
  type VoiceRecording, type InsertVoiceRecording,
  type VideoTemplate, type InsertVideoTemplate,
  type ProcessedVideo, type InsertProcessedVideo,
  type ProcessedVideoPerson, type InsertProcessedVideoPerson,
  type Person, type InsertPerson,
  type Profile, type InsertProfile,
  type Template, type InsertTemplate
} from "@shared/schema";
import session from "express-session";
import { db, pool } from './db';
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
  updateVoiceCloneStatus(id: number, status: string, elevenLabsVoiceId?: string, error?: string): Promise<VoiceRecording | undefined>;
  
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
}

// New DatabaseStorage implementation with Drizzle ORM
export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    // Set up the session store with PostgreSQL
    const PostgresStore = connectPg(session);
    this.sessionStore = new PostgresStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const cacheKey = CacheKeys.user(id);
    const cached = cache.get<User>(cacheKey);
    if (cached) return cached;

    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (user) {
      cache.set(cacheKey, user, CacheTTL.MEDIUM);
    }
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserSubscription(id: number, subscriptionStatus: string): Promise<User | undefined> {
    const [user] = await db
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
    
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  // People operations
  async getPerson(id: number): Promise<Person | undefined> {
    const [person] = await db.select().from(people).where(eq(people.id, id));
    return person;
  }

  async getPeopleByUserId(userId: number): Promise<Person[]> {
    const cacheKey = CacheKeys.userPeople(userId);
    const cached = cache.get<Person[]>(cacheKey);
    if (cached) return cached;

    const result = await db.select().from(people).where(eq(people.userId, userId)).orderBy(people.name);
    cache.set(cacheKey, result, CacheTTL.MEDIUM);
    return result;
  }

  async createPerson(insertPerson: InsertPerson): Promise<Person> {
    const [person] = await db
      .insert(people)
      .values(insertPerson)
      .returning();
    
    // Invalidate related caches
    cache.del(CacheKeys.userPeople(insertPerson.userId));
    
    return person;
  }

  async updatePerson(id: number, updateData: Partial<InsertPerson>): Promise<Person | undefined> {
    const [person] = await db
      .update(people)
      .set(updateData)
      .where(eq(people.id, id))
      .returning();
    return person;
  }

  async deletePerson(id: number): Promise<boolean> {
    // First, get all voice recordings and face images for this person
    const personVoiceRecordings = await db.select().from(voiceRecordings).where(eq(voiceRecordings.personId, id));
    const personFaceImages = await db.select().from(faceImages).where(eq(faceImages.personId, id));
    
    // Find processed videos that reference this person's voice recordings or face images
    const voiceRecordingIds = personVoiceRecordings.map(vr => vr.id);
    const faceImageIds = personFaceImages.map(fi => fi.id);
    
    // Delete processed videos that reference this person's data
    if (voiceRecordingIds.length > 0) {
      await db.delete(processedVideos).where(inArray(processedVideos.voiceRecordingId, voiceRecordingIds));
    }
    if (faceImageIds.length > 0) {
      await db.delete(processedVideos).where(inArray(processedVideos.faceImageId, faceImageIds));
    }
    
    // Delete processed video people entries
    await db.delete(processedVideoPeople).where(eq(processedVideoPeople.personId, id));
    
    // Now delete the person (cascade will handle voice recordings and face images)
    await db.delete(people).where(eq(people.id, id));
    return true;
  }
  
  // Face image operations
  async getFaceImage(id: number): Promise<FaceImage | undefined> {
    const [faceImage] = await db.select().from(faceImages).where(eq(faceImages.id, id));
    
    if (faceImage && faceImage.imageUrl) {
      // Try to decrypt if data is encrypted
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
    return await db.select().from(faceImages).where(eq(faceImages.userId, userId));
  }
  
  async getFaceImagesByPersonId(personId: number): Promise<FaceImage[]> {
    const cacheKey = CacheKeys.personFaceImages(personId);
    const cached = cache.get<FaceImage[]>(cacheKey);
    if (cached) return cached;

    const result = await db.select().from(faceImages).where(eq(faceImages.personId, personId));
    cache.set(cacheKey, result, CacheTTL.SHORT);
    return result;
  }

  async createFaceImage(insertFaceImage: InsertFaceImage): Promise<FaceImage> {
    // If this will be set as default, unset any existing default
    if (insertFaceImage.isDefault) {
      await db
        .update(faceImages)
        .set({ isDefault: false })
        .where(eq(faceImages.personId, insertFaceImage.personId));
    }
    
    // Encrypt sensitive image data if it contains actual image data
    let processedFaceImage = { ...insertFaceImage };
    
    if (insertFaceImage.imageUrl && insertFaceImage.imageUrl.startsWith('data:image/')) {
      try {
        const encryptedData = await storeSecureData(
          `faceImage:${Date.now()}`, 
          insertFaceImage.imageUrl,
          `cache:face_image:${insertFaceImage.personId}:${Date.now()}`
        );
        
        // Store encrypted data as JSON string in imageUrl field
        processedFaceImage.imageUrl = JSON.stringify(encryptedData);
        console.log('Face image data encrypted successfully');
      } catch (error) {
        console.error('Face image encryption failed:', error);
        // Continue with original data if encryption fails
      }
    }
    
    const [faceImage] = await db
      .insert(faceImages)
      .values(processedFaceImage)
      .returning();
    
    // Invalidate related caches
    cache.del(CacheKeys.personFaceImages(insertFaceImage.personId));
    
    return faceImage;
  }

  async setDefaultFaceImage(id: number): Promise<FaceImage | undefined> {
    // Get the face image to get its personId
    const [faceImage] = await db.select().from(faceImages).where(eq(faceImages.id, id));
    if (!faceImage) return undefined;
    
    // Unset any existing default
    await db
      .update(faceImages)
      .set({ isDefault: false })
      .where(eq(faceImages.personId, faceImage.personId));
    
    // Set this one as default
    const [updatedFaceImage] = await db
      .update(faceImages)
      .set({ isDefault: true })
      .where(eq(faceImages.id, id))
      .returning();
    
    return updatedFaceImage;
  }

  async deleteFaceImage(id: number): Promise<boolean> {
    await db.delete(faceImages).where(eq(faceImages.id, id));
    return true;
  }
  
  // Face video operations
  async getFaceVideo(id: number): Promise<FaceVideo | undefined> {
    const [faceVideo] = await db.select().from(faceVideos).where(eq(faceVideos.id, id));
    return faceVideo;
  }

  async getFaceVideosByUserId(userId: number): Promise<FaceVideo[]> {
    return await db.select().from(faceVideos).where(eq(faceVideos.userId, userId));
  }
  
  async getFaceVideosByPersonId(personId: number): Promise<FaceVideo[]> {
    return await db.select().from(faceVideos).where(eq(faceVideos.personId, personId));
  }

  async createFaceVideo(insertFaceVideo: InsertFaceVideo): Promise<FaceVideo> {
    const [faceVideo] = await db
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
    
    const [updatedFaceVideo] = await db
      .update(faceVideos)
      .set(updateData)
      .where(eq(faceVideos.id, id))
      .returning();
    
    return updatedFaceVideo;
  }

  async deleteFaceVideo(id: number): Promise<boolean> {
    await db.delete(faceVideos).where(eq(faceVideos.id, id));
    return true;
  }
  
  // Voice recording operations
  async getVoiceRecording(id: number): Promise<VoiceRecording | undefined> {
    const [voiceRecording] = await db.select().from(voiceRecordings).where(eq(voiceRecordings.id, id));
    
    if (voiceRecording && voiceRecording.audioUrl) {
      // Try to decrypt if data is encrypted
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
    return await db.select().from(voiceRecordings).where(eq(voiceRecordings.userId, userId));
  }
  
  async getVoiceRecordingsByPersonId(personId: number): Promise<VoiceRecording[]> {
    const cacheKey = CacheKeys.personVoiceRecordings(personId);
    const cached = cache.get<VoiceRecording[]>(cacheKey);
    if (cached) return cached;

    const result = await db.select().from(voiceRecordings).where(eq(voiceRecordings.personId, personId));
    cache.set(cacheKey, result, CacheTTL.SHORT);
    return result;
  }

  async createVoiceRecording(insertVoiceRecording: InsertVoiceRecording): Promise<VoiceRecording> {
    // If this will be set as default, unset any existing default
    if (insertVoiceRecording.isDefault) {
      await db
        .update(voiceRecordings)
        .set({ isDefault: false })
        .where(eq(voiceRecordings.personId, insertVoiceRecording.personId));
    }
    
    // Encrypt sensitive voice data if it contains actual audio data
    let processedVoiceRecording = { ...insertVoiceRecording };
    
    if (insertVoiceRecording.audioUrl && insertVoiceRecording.audioUrl.startsWith('data:audio/')) {
      try {
        const encryptedData = await storeSecureData(
          `voiceRecording:${Date.now()}`, 
          insertVoiceRecording.audioUrl,
          `cache:voice_recording:${insertVoiceRecording.personId}:${Date.now()}`
        );
        
        // Store encrypted data as JSON string in audioUrl field
        processedVoiceRecording.audioUrl = JSON.stringify(encryptedData);
        console.log('Voice recording data encrypted successfully');
      } catch (error) {
        console.error('Voice recording encryption failed:', error);
        // Continue with original data if encryption fails
      }
    }
    
    const [voiceRecording] = await db
      .insert(voiceRecordings)
      .values(processedVoiceRecording)
      .returning();
    
    // Invalidate related caches
    cache.del(CacheKeys.personVoiceRecordings(insertVoiceRecording.personId));
    
    return voiceRecording;
  }

  async setDefaultVoiceRecording(id: number): Promise<VoiceRecording | undefined> {
    // Get the voice recording to get its personId
    const [voiceRecording] = await db.select().from(voiceRecordings).where(eq(voiceRecordings.id, id));
    if (!voiceRecording) return undefined;
    
    // Unset any existing default
    await db
      .update(voiceRecordings)
      .set({ isDefault: false })
      .where(eq(voiceRecordings.personId, voiceRecording.personId));
    
    // Set this one as default
    const [updatedVoiceRecording] = await db
      .update(voiceRecordings)
      .set({ isDefault: true })
      .where(eq(voiceRecordings.id, id))
      .returning();
    
    return updatedVoiceRecording;
  }

  async deleteVoiceRecording(id: number): Promise<boolean> {
    await db.delete(voiceRecordings).where(eq(voiceRecordings.id, id));
    return true;
  }

  async updateVoiceCloneStatus(id: number, status: string, elevenLabsVoiceId?: string, error?: string): Promise<VoiceRecording | undefined> {
    try {
      const updateData: any = { voiceCloneStatus: status };
      if (elevenLabsVoiceId) updateData.elevenLabsVoiceId = elevenLabsVoiceId;
      if (error) updateData.voiceCloneError = error;

      const result = await db
        .update(voiceRecordings)
        .set(updateData)
        .where(eq(voiceRecordings.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("Error updating voice clone status:", error);
      return undefined;
    }
  }
  
  // Video template operations
  async getVideoTemplate(id: number): Promise<VideoTemplate | undefined> {
    const [videoTemplate] = await db.select().from(videoTemplates).where(eq(videoTemplates.id, id));
    return videoTemplate;
  }

  async getAllVideoTemplates(): Promise<VideoTemplate[]> {
    const cacheKey = CacheKeys.videoTemplates();
    const cached = cache.get<VideoTemplate[]>(cacheKey);
    if (cached) return cached;

    const result = await db.select().from(videoTemplates);
    cache.set(cacheKey, result, CacheTTL.LONG);
    return result;
  }
  
  async getVideoTemplatesByCategory(category: string): Promise<VideoTemplate[]> {
    return await db.select().from(videoTemplates).where(eq(videoTemplates.category, category));
  }
  
  async getVideoTemplatesByAgeRange(ageRange: string): Promise<VideoTemplate[]> {
    return await db.select().from(videoTemplates).where(eq(videoTemplates.ageRange, ageRange));
  }
  
  async getFeaturedVideoTemplates(): Promise<VideoTemplate[]> {
    const cacheKey = CacheKeys.videoTemplatesFeatured();
    const cached = cache.get<VideoTemplate[]>(cacheKey);
    if (cached) return cached;

    const result = await db.select().from(videoTemplates).where(eq(videoTemplates.featured, true));
    cache.set(cacheKey, result, CacheTTL.LONG);
    return result;
  }

  async createVideoTemplate(insertVideoTemplate: InsertVideoTemplate): Promise<VideoTemplate> {
    const [videoTemplate] = await db
      .insert(videoTemplates)
      .values(insertVideoTemplate)
      .returning();
    return videoTemplate;
  }

  async updateVideoTemplate(id: number, updateData: Partial<InsertVideoTemplate>): Promise<VideoTemplate | undefined> {
    const [videoTemplate] = await db
      .update(videoTemplates)
      .set(updateData)
      .where(eq(videoTemplates.id, id))
      .returning();
    return videoTemplate;
  }

  async deleteVideoTemplate(id: number): Promise<boolean> {
    await db.delete(videoTemplates).where(eq(videoTemplates.id, id));
    return true;
  }
  
  // Processed video operations
  async getProcessedVideo(id: number): Promise<ProcessedVideo | undefined> {
    const [processedVideo] = await db.select().from(processedVideos).where(eq(processedVideos.id, id));
    return processedVideo;
  }

  async getProcessedVideosByUserId(userId: number): Promise<ProcessedVideo[]> {
    return await db.select().from(processedVideos).where(eq(processedVideos.userId, userId));
  }

  async createProcessedVideo(insertProcessedVideo: InsertProcessedVideo): Promise<ProcessedVideo> {
    const [processedVideo] = await db
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
    
    const [processedVideo] = await db
      .update(processedVideos)
      .set(updateData)
      .where(eq(processedVideos.id, id))
      .returning();
    return processedVideo;
  }

  async deleteProcessedVideo(id: number): Promise<boolean> {
    await db.delete(processedVideos).where(eq(processedVideos.id, id));
    return true;
  }
  
  // Processed video people operations
  async createProcessedVideoPerson(insertProcessedVideoPerson: InsertProcessedVideoPerson): Promise<ProcessedVideoPerson> {
    const [processedVideoPerson] = await db
      .insert(processedVideoPeople)
      .values(insertProcessedVideoPerson)
      .returning();
    return processedVideoPerson;
  }
}

// Use the new Drizzle-powered storage implementation
export const storage = new DatabaseStorage();