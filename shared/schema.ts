import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define all tables first without relations

// Users table for storing parent accounts
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role").default("user").notNull(), // "user", "admin"
  subscriptionStatus: text("subscription_status").default("free").notNull(), // "free", "premium"
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// People profiles (multiple faces/voices that can be used in videos)
export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  relationship: text("relationship"), // e.g., "parent", "grandparent", "sibling", etc.
  avatarUrl: text("avatar_url"), // Optional small profile image 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Face image references linked to people profiles
export const faceImages = pgTable("face_images", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  personId: integer("person_id").references(() => people.id, { onDelete: "cascade" }).notNull(),
  imageUrl: text("image_url").notNull(),
  imageData: text("image_data").notNull(), // Base64 encoded image data for ML processing
  name: text("name").notNull(),
  isDefault: boolean("is_default").default(false), // Whether this is the default face for this person
  mlProcessed: boolean("ml_processed").default(false), // Whether this image has been processed by ML models
  faceEmbedding: jsonb("face_embedding"), // JSON data for face embedding vectors stored after ML processing
  sourceVideoId: integer("source_video_id").references(() => faceVideos.id), // Reference to the source video if extracted from video
  expressionType: text("expression_type").default("neutral"), // neutral, smile, angle, talking, expression, lighting
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Face videos for extracting multiple face images
export const faceVideos = pgTable("face_videos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  personId: integer("person_id").references(() => people.id, { onDelete: "cascade" }).notNull(),
  videoUrl: text("video_url").notNull(),
  videoData: text("video_data"), // Optional Base64 encoded video data (might be large)
  name: text("name").notNull(),
  duration: integer("duration"), // in seconds
  expressionType: text("expression_type").default("neutral"), // neutral, smile, angle, talking, expression, lighting
  extractedFacesCount: integer("extracted_faces_count").default(0), // Number of face images extracted from this video
  isProcessed: boolean("is_processed").default(false), // Whether this video has been processed to extract faces
  processingStatus: text("processing_status").default("pending"), // pending, processing, completed, failed
  errorMessage: text("error_message"), // Error message if processing failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Voice recordings linked to people profiles
export const voiceRecordings = pgTable("voice_recordings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  personId: integer("person_id").references(() => people.id, { onDelete: "cascade" }).notNull(),
  audioUrl: text("audio_url").notNull(),
  audioData: text("audio_data"), // Base64 encoded audio data for ML processing
  name: text("name").notNull(),
  duration: integer("duration"), // in seconds
  isDefault: boolean("is_default").default(false), // Whether this is the default voice for this person
  mlProcessed: boolean("ml_processed").default(false), // Whether this recording has been processed by ML models
  voiceEmbedding: jsonb("voice_embedding"), // JSON data for voice embedding vectors stored after ML processing
  elevenLabsVoiceId: text("elevenlabs_voice_id"), // Store the cloned voice ID
  voiceCloneStatus: text("voice_clone_status").default("pending"), // pending, processing, completed, failed
  voiceCloneError: text("voice_clone_error"), // Store any error messages
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Educational video templates
export const videoTemplates = pgTable("video_templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  videoUrl: text("video_url").notNull(),
  duration: integer("duration").notNull(), // in seconds
  category: text("category").notNull(), // e.g., "counting", "alphabet", "colors"
  ageRange: text("age_range").notNull(), // e.g., "0-2", "3-5", "6-8"
  featured: boolean("featured").default(false),
  isPremium: boolean("is_premium").default(false), // Whether this is a premium template requiring subscription
  price: integer("price"), // Price in cents, if applicable
  voiceOnly: boolean("voice_only").default(false), // Whether this template is for voice-only processing
});

// Processed videos with parent face/voice
export const processedVideos = pgTable("processed_videos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  templateId: integer("template_id").references(() => videoTemplates.id).notNull(),
  faceImageId: integer("face_image_id").references(() => faceImages.id),
  voiceRecordingId: integer("voice_recording_id").references(() => voiceRecordings.id),
  voiceOnly: boolean("voice_only").default(false), // Whether to only replace voice, no face swapping
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  error: text("error"),
  outputUrl: text("output_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Junction table for processed videos and people (supports multiple people in a video)
export const processedVideoPeople = pgTable("processed_video_people", {
  id: serial("id").primaryKey(),
  processedVideoId: integer("processed_video_id").references(() => processedVideos.id, { onDelete: "cascade" }).notNull(),
  personId: integer("person_id").references(() => people.id).notNull(),
  faceImageId: integer("face_image_id").references(() => faceImages.id),
  voiceRecordingId: integer("voice_recording_id").references(() => voiceRecordings.id),
  role: text("role"), // "main", "supporting", etc.
});

// Now define all relations

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  people: many(people),
  faceImages: many(faceImages),
  faceVideos: many(faceVideos),
  voiceRecordings: many(voiceRecordings),
  processedVideos: many(processedVideos),
}));

// People relations
export const peopleRelations = relations(people, ({ one, many }) => ({
  user: one(users, {
    fields: [people.userId],
    references: [users.id]
  }),
  faceImages: many(faceImages),
  faceVideos: many(faceVideos),
  voiceRecordings: many(voiceRecordings),
  processedVideoPeople: many(processedVideoPeople)
}));

// Face images relations
export const faceImagesRelations = relations(faceImages, ({ one, many }) => ({
  user: one(users, {
    fields: [faceImages.userId],
    references: [users.id]
  }),
  person: one(people, {
    fields: [faceImages.personId],
    references: [people.id]
  }),
  processedVideoPeople: many(processedVideoPeople)
}));

// Face videos relations
export const faceVideosRelations = relations(faceVideos, ({ one }) => ({
  user: one(users, {
    fields: [faceVideos.userId],
    references: [users.id]
  }),
  person: one(people, {
    fields: [faceVideos.personId],
    references: [people.id]
  })
}));

// Voice recordings relations
export const voiceRecordingsRelations = relations(voiceRecordings, ({ one, many }) => ({
  user: one(users, {
    fields: [voiceRecordings.userId],
    references: [users.id]
  }),
  person: one(people, {
    fields: [voiceRecordings.personId],
    references: [people.id]
  }),
  processedVideoPeople: many(processedVideoPeople)
}));

// Video templates relations
export const videoTemplatesRelations = relations(videoTemplates, ({ many }) => ({
  processedVideos: many(processedVideos)
}));

// Processed videos relations
export const processedVideosRelations = relations(processedVideos, ({ one, many }) => ({
  user: one(users, {
    fields: [processedVideos.userId],
    references: [users.id]
  }),
  template: one(videoTemplates, {
    fields: [processedVideos.templateId],
    references: [videoTemplates.id]
  }),
  faceImage: one(faceImages, {
    fields: [processedVideos.faceImageId],
    references: [faceImages.id]
  }),
  voiceRecording: one(voiceRecordings, {
    fields: [processedVideos.voiceRecordingId],
    references: [voiceRecordings.id]
  }),
  people: many(processedVideoPeople)
}));

// Processed videos people (junction table) relations
export const processedVideoPeopleRelations = relations(processedVideoPeople, ({ one }) => ({
  processedVideo: one(processedVideos, {
    fields: [processedVideoPeople.processedVideoId],
    references: [processedVideos.id]
  }),
  person: one(people, {
    fields: [processedVideoPeople.personId],
    references: [people.id]
  }),
  faceImage: one(faceImages, {
    fields: [processedVideoPeople.faceImageId],
    references: [faceImages.id]
  }),
  voiceRecording: one(voiceRecordings, {
    fields: [processedVideoPeople.voiceRecordingId],
    references: [voiceRecordings.id]
  })
}));

// Schema definitions for insert operations
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPersonSchema = createInsertSchema(people).omit({
  id: true,
  createdAt: true
});

export const insertFaceImageSchema = createInsertSchema(faceImages).omit({
  id: true, 
  createdAt: true,
  mlProcessed: true,
  faceEmbedding: true
});

export const insertFaceVideoSchema = createInsertSchema(faceVideos).omit({
  id: true,
  createdAt: true,
  extractedFacesCount: true,
  isProcessed: true,
  processingStatus: true,
  errorMessage: true
});

// The original voice recording schema
const originalVoiceRecordingSchema = createInsertSchema(voiceRecordings).omit({
  id: true,
  createdAt: true,
  mlProcessed: true,
  voiceEmbedding: true
});

// Voice recording schema with proper validation
export const insertVoiceRecordingSchema = originalVoiceRecordingSchema.extend({
  // Duration is required in the database but can be optional in input
  duration: z.number().optional().default(0),
  // audioData is optional (used for ML processing)
  audioData: z.string().optional(),
  // audioUrl is required in database - we'll generate it from audioData if not provided
  audioUrl: z.string().min(1, "Audio URL is required"),
});

export const insertVideoTemplateSchema = createInsertSchema(videoTemplates).omit({
  id: true,
});

export const insertProcessedVideoSchema = createInsertSchema(processedVideos).omit({
  id: true,
  createdAt: true,
  status: true,
  error: true,
  outputUrl: true,
}).extend({
  // Add additional fields for client-side data that won't be stored directly in the database
  voiceOptions: z.object({
    quality: z.enum(['low', 'standard', 'high']).optional(),
    preserveAccent: z.boolean().optional(),
    preserveEmotion: z.boolean().optional(),
    enableDiarization: z.boolean().optional(),
    speakerAssignments: z.array(z.object({
      speakerId: z.string(),
      personId: z.number(),
      replace: z.boolean()
    })).optional()
  }).optional(),
  people: z.array(z.object({
    personId: z.number(),
    faceImageId: z.number().optional(),
    voiceRecordingId: z.number().optional(),
    role: z.string().optional()
  })).optional(),
  quality: z.enum(['low', 'standard', 'high']).optional()
});

export const insertProcessedVideoPersonSchema = createInsertSchema(processedVideoPeople).omit({
  id: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Person = typeof people.$inferSelect;
export type InsertPerson = z.infer<typeof insertPersonSchema>;

export type FaceImage = typeof faceImages.$inferSelect;
export type InsertFaceImage = z.infer<typeof insertFaceImageSchema>;

export type FaceVideo = typeof faceVideos.$inferSelect;
export type InsertFaceVideo = z.infer<typeof insertFaceVideoSchema>;

export type VoiceRecording = typeof voiceRecordings.$inferSelect;
export type InsertVoiceRecording = z.infer<typeof insertVoiceRecordingSchema>;

export type VideoTemplate = typeof videoTemplates.$inferSelect;
export type InsertVideoTemplate = z.infer<typeof insertVideoTemplateSchema>;

export type ProcessedVideo = typeof processedVideos.$inferSelect;
export type InsertProcessedVideo = z.infer<typeof insertProcessedVideoSchema>;

export type ProcessedVideoPerson = typeof processedVideoPeople.$inferSelect;
export type InsertProcessedVideoPerson = z.infer<typeof insertProcessedVideoPersonSchema>;
