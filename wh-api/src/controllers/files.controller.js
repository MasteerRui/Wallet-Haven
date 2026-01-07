import multer from "multer";
import path from "path";
import { config } from "../config/env.js";
import { supabase } from "../services/supabase.service.js";
import fs from "fs";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/";
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, GIF, WEBP, and PDF are allowed."
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, 
  },
});

export const filesController = {
  
  uploadMiddleware: upload.single("file"),

  
  uploadFile: async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const user_id = req.user.id;
      const file = req.file;

      
      const { data: fileRecord, error } = await supabase
        .from("files")
        .insert({
          user_id: user_id,
          file_url: file.path, 
          file_name: file.originalname,
          file_type: file.mimetype,
          file_size: file.size,
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving file to database:", error);
        
        fs.unlinkSync(file.path);
        return res.status(500).json({
          success: false,
          message: "Failed to save file information",
        });
      }

      res.status(201).json({
        success: true,
        file: {
          id: fileRecord.id,
          file_url: fileRecord.file_url,
          file_name: fileRecord.file_name,
          file_type: fileRecord.file_type,
          file_size: fileRecord.file_size,
          created_at: fileRecord.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  getFile: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const { data: file, error } = await supabase
        .from("files")
        .select("*")
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (error || !file) {
        return res.status(404).json({
          success: false,
          message: "File not found",
        });
      }

      
      if (file.file_url && fs.existsSync(file.file_url)) {
        
        
        file.file_url = `/${file.file_url}`;
      }

      res.status(200).json({
        success: true,
        file: file,
      });
    } catch (error) {
      next(error);
    }
  },

  
  deleteFile: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      
      const { data: file, error: fetchError } = await supabase
        .from("files")
        .select("*")
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (fetchError || !file) {
        return res.status(404).json({
          success: false,
          message: "File not found",
        });
      }

      
      const { error: deleteError } = await supabase
        .from("files")
        .delete()
        .eq("id", id)
        .eq("user_id", user_id);

      if (deleteError) {
        return res.status(500).json({
          success: false,
          message: "Failed to delete file",
        });
      }

      
      if (file.file_url && fs.existsSync(file.file_url)) {
        fs.unlinkSync(file.file_url);
      }

      res.status(200).json({
        success: true,
        message: "File deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },
};
