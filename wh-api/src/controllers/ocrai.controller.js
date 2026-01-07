import multer from "multer";
import path from "path";
import fs from "fs";
import { ocrAiService } from "../services/ocrai.service.js";
import { supabase } from "../services/supabase.service.js";
import { config } from "../config/env.js";
import { convertCurrency } from "../services/currency.service.js";
import {
  getUserLanguage,
  translate,
  translateCategory,
  getCurrencyConversionNote,
} from "../utils/translations.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG and PNG files are allowed."),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, 
  },
});

const uploadReceiptFile = async (file, userId) => {
  try {
    if (!file || !file.path) {
      console.error("uploadReceiptFile: missing file");
      return { fileId: null, fileUrl: null };
    }

    const bucket = config.SUPABASE_STORAGE_BUCKET || "main";
    const fileExt = path.extname(file.originalname || "receipt.jpg") || ".jpg";
    const objectName = `ocrai/${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}${fileExt}`;

    const fileBuffer = fs.readFileSync(file.path);

    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectName, fileBuffer, {
        contentType: file.mimetype || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("uploadReceiptFile: storage upload error:", uploadError);
      return { fileId: null, fileUrl: null };
    }

    
    const storagePath = uploadData?.path || objectName;

    
    
    const fileUrl = null; 

    
    
    const { data: fileRecord, error: fileInsertError } = await supabase
      .from("files")
      .insert({
        user_id: userId,
        file_url: storagePath, 
        thumb_url: null,
        file_type: file.mimetype || null,
        file_size: file.size || null,
        file_name: file.originalname || objectName,
      })
      .select()
      .single();

    if (fileInsertError) {
      console.error("uploadReceiptFile: file insert error:", fileInsertError);
      return { fileId: null, fileUrl: null, storagePath: storagePath };
    }

    return { fileId: fileRecord.id, fileUrl: null, storagePath: storagePath };
  } catch (err) {
    console.error("uploadReceiptFile: unexpected error:", err);
    return { fileId: null, fileUrl: null };
  }
};

class OcrAiController {
  
  async processSingleImage(file, userId, options = {}) {
    const imagePath = file.path;
    
    try {
      ocrAiService.validateImageFile(imagePath);
    } catch (validationError) {
      fs.unlinkSync(imagePath);
      throw validationError;
    }

    
    let fileId = null;
    let storagePath = null;
    try {
      const uploadResult = await uploadReceiptFile(file, userId);
      fileId = uploadResult.fileId;
      storagePath = uploadResult.storagePath;
    } catch (uploadErr) {
      console.error("Error uploading receipt file:", uploadErr);
      
    }

    
    
    
    let fileUrl = null;
    if (storagePath) {
      const bucket = config.SUPABASE_STORAGE_BUCKET || "main";

      try {
        const { data: signedUrlData, error: signedUrlError } =
          await supabase.storage
            .from(bucket)
            .createSignedUrl(storagePath, 3600); 

        if (!signedUrlError && signedUrlData?.signedUrl) {
          fileUrl = signedUrlData.signedUrl;
        } else {
          
          
          console.warn(
            `[Process] ⚠️ Could not generate signed URL immediately (file will be available via /pending):`,
            {
              error: signedUrlError?.message || "Unknown error",
              storagePath: storagePath,
            }
          );
        }
      } catch (err) {
        
        console.warn(
          `[Process] ⚠️ Error generating signed URL (non-critical):`,
          err.message
        );
      }
    }

    
    const result = await ocrAiService.processAndGetResult(imagePath, options);

    
    const structuredData = extractStructuredData(result.result);
    const rawText = formatExtractedText(result.result);

    let categories = [];
    let analyzedData = null;
    let ocraiResultId = null;
    let ocrStatus = "pending";
    let isDuplicate = false;
    let userLanguage = "english"; 

    try {
      
      userLanguage = await getUserLanguage(userId, supabase);
      
      
      categories = await ocrAiService.getUserCategories(userId);

      
      if (structuredData.hasData) {
        const duplicateResult = await ocrAiService.findDuplicateOcraiResult(
          userId,
          structuredData
        );

        if (duplicateResult && duplicateResult.corrected_data) {
          
          analyzedData = duplicateResult.corrected_data;
          ocraiResultId = duplicateResult.id;
          ocrStatus = duplicateResult.ocr_status || "processed"; 
          isDuplicate = true;
        } else {
        }
      } else {
      }

      
      if (!isDuplicate) {
        
        if (ocrAiService.openai && structuredData.hasData) {
          try {
            analyzedData = await ocrAiService.analyzeReceiptWithGPT4o(
              structuredData,
              rawText,
              categories
            );
            ocrStatus = "completed";
          } catch (gptError) {
            console.error("GPT-4o analysis error:", gptError);
            ocrStatus = "ai_failed";
            
          }
        } else {
          ocrStatus = "no_ai";
        }
      }

      
      if (analyzedData && analyzedData.category_id) {
        const category = categories.find(
          (cat) => cat.id === analyzedData.category_id
        );
        if (category) {
          const translatedCategory = translateCategory(category, userLanguage);
          analyzedData.category_name = translatedCategory.name; 
          analyzedData.category_icon = category.icon;
          analyzedData.category_color = category.color;
        }
      }

      
      if (analyzedData) {
      }

      
      if (!isDuplicate) {
        
        const extractedDataJson = structuredData ? JSON.stringify(structuredData) : null;
        const correctedDataJson = analyzedData ? JSON.stringify(analyzedData) : null;
        
        const ocraiResultData = {
          user_id: userId,
          transaction_id: null,
          file_id: fileId || null, 
          raw_text: rawText || "",
          extracted_data: structuredData || {}, 
          corrected_data: analyzedData || null, 
          ocr_status: "processed", 
        };

        try {
          const { data: ocraiResult, error: ocraiError } = await supabase
            .from("ocrai_results")
            .insert(ocraiResultData)
            .select()
            .single();

          if (ocraiError) {
            console.error("[Process] ❌ Error saving ocrai_result:", {
              error: ocraiError,
              code: ocraiError.code,
              message: ocraiError.message,
              details: ocraiError.details,
              hint: ocraiError.hint,
              data: {
                user_id: ocraiResultData.user_id,
                file_id: ocraiResultData.file_id,
                hasExtractedData: !!ocraiResultData.extracted_data,
                hasCorrectedData: !!ocraiResultData.corrected_data,
                ocr_status: ocraiResultData.ocr_status,
              },
            });
            
            
          } else if (ocraiResult && ocraiResult.id) {
            ocraiResultId = ocraiResult.id;
          } else {
            console.warn("[Process] ⚠️ Insert returned no data but no error:", {
              ocraiResult,
              ocraiError,
            });
          }
        } catch (insertException) {
          console.error("[Process] ❌ Exception during insert:", {
            error: insertException,
            message: insertException.message,
            stack: insertException.stack,
          });
        }
      } else {
      }
    } catch (categoryError) {
      console.error("Error fetching categories or analyzing:", categoryError);
      ocrStatus = "error";
    }

    
    fs.unlinkSync(imagePath);

    
    let ocraiResultRecord = null;
    if (ocraiResultId) {
      
      let categoriesForEnrichment = categories;
      if (categoriesForEnrichment.length === 0) {
        try {
          categoriesForEnrichment = await ocrAiService.getUserCategories(
            userId
          );
        } catch (err) {
          console.error("Error fetching categories for enrichment:", err);
        }
      }

      const { data: record } = await supabase
        .from("ocrai_results")
        .select(
          "id, user_id, file_id, transaction_id, raw_text, extracted_data, corrected_data, ocr_status, created_at, updated_at"
        )
        .eq("id", ocraiResultId)
        .single();

      if (record) {
        ocraiResultRecord = record;

        
        if (
          record.corrected_data &&
          typeof record.corrected_data === "string"
        ) {
          try {
            record.corrected_data = JSON.parse(record.corrected_data);
          } catch (e) {
            console.error("Error parsing corrected_data:", e);
            record.corrected_data = null;
          }
        }

        
        if (!record.corrected_data) {
          if (record.extracted_data && record.extracted_data.hasData) {
            record.corrected_data = {
              type: "expense",
              amount: record.extracted_data.total || 0,
              date:
                record.extracted_data.date ||
                new Date().toISOString().split("T")[0],
              merchant: record.extracted_data.merchantName || null,
              notes: record.raw_text ? record.raw_text.substring(0, 200) : null,
              tags: null,
              items: record.extracted_data.items || [],
              category_id: null,
              confidence: 0.3,
            };
          } else if (record.raw_text && record.raw_text.trim().length > 0) {
            record.corrected_data = {
              type: "expense",
              amount: 0,
              date: new Date().toISOString().split("T")[0],
              merchant: null,
              notes: record.raw_text.substring(0, 500),
              tags: null,
              items: [],
              category_id: null,
              confidence: 0.1,
            };
          }
        }

        
        if (record.corrected_data && record.corrected_data.category_id) {
          const category = categoriesForEnrichment.find(
            (cat) => cat.id === record.corrected_data.category_id
          );
          if (category) {
            record.corrected_data.category_name = category.name;
            record.corrected_data.category_icon = category.icon;
            record.corrected_data.category_color = category.color;
          }
        }

        
      }
    }

    
    let fileUrlFromDb = fileUrl;

    
    if (isDuplicate && ocraiResultId) {
      
      let categoriesForEnrichment = categories;
      if (categoriesForEnrichment.length === 0) {
        try {
          categoriesForEnrichment = await ocrAiService.getUserCategories(
            userId
          );
        } catch (err) {
          console.error("Error fetching categories for enrichment:", err);
        }
      }

      
      const { data: ocraiRecord } = await supabase
        .from("ocrai_results")
        .select("file_id")
        .eq("id", ocraiResultId)
        .single();

      if (ocraiRecord?.file_id) {
        const { data: fileRecord } = await supabase
          .from("files")
          .select("file_url")
          .eq("id", ocraiRecord.file_id)
          .single();

        if (fileRecord?.file_url) {
          
          let storagePath = fileRecord.file_url;

          
          if (storagePath.includes("/storage/v1/object/public/")) {
            const urlParts = storagePath.split("/storage/v1/object/public/");
            if (urlParts.length > 1) {
              const afterBucket = urlParts[1].split("/").slice(1).join("/");
              storagePath = afterBucket;
            }
          } else if (storagePath.includes("/object/public/")) {
            const urlParts = storagePath.split("/object/public/");
            if (urlParts.length > 1) {
              const afterBucket = urlParts[1].split("/").slice(1).join("/");
              storagePath = afterBucket;
            }
          }

          const bucket = config.SUPABASE_STORAGE_BUCKET || "main";
          const { data: signedUrlData, error: signedUrlError } =
            await supabase.storage
              .from(bucket)
              .createSignedUrl(storagePath, 3600); 

          if (!signedUrlError && signedUrlData?.signedUrl) {
            fileUrlFromDb = signedUrlData.signedUrl;
          } else {
            console.error("Error generating signed URL:", {
              error: signedUrlError,
              storagePath: storagePath,
              originalFileUrl: fileRecord.file_url,
            });
          }
        }
      }

      const { data: record } = await supabase
        .from("ocrai_results")
        .select(
          "id, user_id, file_id, transaction_id, raw_text, extracted_data, corrected_data, ocr_status, created_at, updated_at"
        )
        .eq("id", ocraiResultId)
        .single();

      if (record) {
        ocraiResultRecord = record;

        
        if (
          record.corrected_data &&
          typeof record.corrected_data === "string"
        ) {
          try {
            record.corrected_data = JSON.parse(record.corrected_data);
          } catch (e) {
            console.error("Error parsing corrected_data:", e);
            record.corrected_data = null;
          }
        }

        
        if (!record.corrected_data) {
          if (record.extracted_data && record.extracted_data.hasData) {
            record.corrected_data = {
              type: "expense",
              amount: record.extracted_data.total || 0,
              date:
                record.extracted_data.date ||
                new Date().toISOString().split("T")[0],
              merchant: record.extracted_data.merchantName || null,
              notes: record.raw_text ? record.raw_text.substring(0, 200) : null,
              tags: null,
              items: record.extracted_data.items || [],
              category_id: null,
              confidence: 0.3,
            };
          } else if (record.raw_text && record.raw_text.trim().length > 0) {
            record.corrected_data = {
              type: "expense",
              amount: 0,
              date: new Date().toISOString().split("T")[0],
              merchant: null,
              notes: record.raw_text.substring(0, 500),
              tags: null,
              items: [],
              category_id: null,
              confidence: 0.1,
            };
          }
        }

        
        if (record.corrected_data && record.corrected_data.category_id) {
          const category = categoriesForEnrichment.find(
            (cat) => cat.id === record.corrected_data.category_id
          );
          if (category) {
            record.corrected_data.category_name = category.name;
            record.corrected_data.category_icon = category.icon;
            record.corrected_data.category_color = category.color;
          }
        }
      }
    }

    
    
    
    if (ocraiResultId || ocraiResultRecord) {
      
      
      const finalCorrectedData =
        analyzedData || ocraiResultRecord?.corrected_data || null;

      
      if (!finalCorrectedData && structuredData) {
        
        finalCorrectedData = {
          type: "expense",
          amount: structuredData.total || 0,
          date: structuredData.date || new Date().toISOString().split("T")[0],
          merchant: structuredData.merchantName || null,
          notes: rawText ? rawText.substring(0, 200) : null,
          tags: null,
          items: structuredData.items || [],
          category_id: null,
          confidence: 0.3,
        };
      }

      const returnData = {
        
        id: ocraiResultRecord?.id || ocraiResultId || null,
        user_id: ocraiResultRecord?.user_id || userId,
        file_id: ocraiResultRecord?.file_id || fileId,
        file_url: fileUrlFromDb || fileUrl || null, 
        transaction_id: ocraiResultRecord?.transaction_id || null,
        raw_text: ocraiResultRecord?.raw_text || rawText,
        extracted_data: ocraiResultRecord?.extracted_data || structuredData,
        corrected_data: finalCorrectedData, 
        ocr_status: ocraiResultRecord?.ocr_status || ocrStatus,
        created_at: ocraiResultRecord?.created_at || new Date().toISOString(),
        updated_at: ocraiResultRecord?.updated_at || new Date().toISOString(),
        
        isDuplicate: isDuplicate,
        ocraiResultId: ocraiResultId,
      };

      

      return returnData;
    }

    
    return {
      extractedText: rawText,
      receiptData: structuredData,
      analyzedData: analyzedData,
      ocraiResultId: ocraiResultId,
      file_id: fileId,
      file_url: fileUrl, 
      ocrStatus: ocrStatus,
      isDuplicate: isDuplicate,
      data: result,
    };
  }

  
  async processImage(req, res) {
    try {
      
      let files = [];
      if (req.files) {
        
        if (req.files.images && Array.isArray(req.files.images)) {
          files = req.files.images;
        } else if (req.files.image && Array.isArray(req.files.image)) {
          files = req.files.image;
        } else if (req.files.image) {
          files = [req.files.image];
        }
      } else if (req.file) {
        
        files = [req.file];
      }

      const maxFiles = 10;

      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No image file(s) provided",
        });
      }

      if (files.length > maxFiles) {
        
        files.forEach((file) => {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
        return res.status(400).json({
          success: false,
          message: `Maximum ${maxFiles} images allowed per request`,
        });
      }

      
      const options = {};
      if (req.body.decimalPlaces) {
        options.decimalPlaces = parseInt(req.body.decimalPlaces);
      }
      if (req.body.cents !== undefined) {
        options.cents = req.body.cents === "true";
      }
      if (req.body.documentType) {
        options.documentType = req.body.documentType;
      }
      if (req.body.defaultDateParsing) {
        options.defaultDateParsing = req.body.defaultDateParsing;
      }
      if (req.body.region) {
        options.region = req.body.region;
      }

      const userId = req.user.id;

      
      const results = [];
      const errors = [];
      let aiCount = 0;
      let duplicateCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const result = await this.processSingleImage(file, userId, options);

          
          if (result?.data?.result?.lineItems) {
          }

          results.push(result);
          if (result.isDuplicate) {
            duplicateCount++;
          } else if (result.analyzedData) {
            aiCount++;
          }
        } catch (error) {
          console.error(`Error processing image ${i + 1}:`, error);
          errors.push({
            index: i,
            filename: file.originalname || `image_${i + 1}`,
            error: error.message || "Failed to process image",
          });
        }
      }

      
      if (files.length > 1) {
        
        res.locals.ocraiAiCount = aiCount;
        res.locals.ocraiDuplicateCount = duplicateCount;
      } else {
        
        if (duplicateCount > 0) {
          res.locals.ocraiType = "duplicate";
        } else if (aiCount > 0) {
          res.locals.ocraiType = "ai";
        }
      }

      
      if (files.length === 1) {
        if (results.length > 0) {
          const result = results[0];
          
          if (result.isDuplicate) {
            res.locals.ocraiType = "duplicate";
          } else if (result.corrected_data || result.analyzedData) {
            res.locals.ocraiType = "ai";
          }

          
          if (result.id && result.corrected_data !== undefined) {
            return res.json({
              success: true,
              message: "Image processed successfully",
              ...result, 
            });
          }

          
          if (result.ocraiResultId === null && !result.isDuplicate) {
            console.warn("[Process] ⚠️ WARNING: Result processed but NOT saved to database!", {
              hasAnalyzedData: !!result.analyzedData,
              hasCorrectedData: !!result.corrected_data,
              ocrStatus: result.ocrStatus,
            });
          }

          
          const analyzedData = result.analyzedData || null;
          const receiptData = result.receiptData || {
            hasData: false,
            merchantName: null,
            total: null,
            items: [],
            date: null,
          };

          return res.json({
            success: true,
            message: "Image processed successfully",
            extractedText: result.extractedText || "",
            receiptData: receiptData,
            extracted_data: receiptData,
            analyzedData: analyzedData,
            corrected_data: analyzedData,
            ocraiResultId: result.ocraiResultId || null,
            ocrStatus: result.ocrStatus || "pending",
            isDuplicate: result.isDuplicate || false,
            data: result.data || null,
          });
        } else {
          return res.status(500).json({
            success: false,
            message: errors[0]?.error || "Failed to process image",
            errors: errors,
          });
        }
      }

      
      const formattedResults = results.map((result) => {
        
        if (result.id && result.corrected_data !== undefined) {
          return result; 
        }

        
        const analyzedData = result.analyzedData || null;
        const receiptData = result.receiptData || {
          hasData: false,
          merchantName: null,
          total: null,
          items: [],
          date: null,
        };

        return {
          extractedText: result.extractedText || "",
          receiptData: receiptData,
          extracted_data: receiptData,
          analyzedData: analyzedData,
          corrected_data: analyzedData,
          ocraiResultId: result.ocraiResultId || null,
          ocrStatus: result.ocrStatus || "pending",
          isDuplicate: result.isDuplicate || false,
          data: result.data || null,
        };
      });

      res.json({
        success: true,
        message: `Processed ${results.length} image(s)`,
        results: formattedResults,
        summary: {
          total: files.length,
          successful: results.length,
          duplicates: results.filter((r) => r.isDuplicate).length,
          errors: errors.length,
        },
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Error processing image(s):", error);

      
      let filesToClean = [];
      if (req.files) {
        if (req.files.images)
          filesToClean = Array.isArray(req.files.images)
            ? req.files.images
            : [req.files.images];
        else if (req.files.image)
          filesToClean = Array.isArray(req.files.image)
            ? req.files.image
            : [req.files.image];
      } else if (req.file) {
        filesToClean = [req.file];
      }

      filesToClean.forEach((file) => {
        if (file?.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });

      res.status(500).json({
        success: false,
        message: error.message || "Failed to process image(s)",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  
  async submitImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      const imagePath = req.file.path;

      
      try {
        ocrAiService.validateImageFile(imagePath);
      } catch (validationError) {
        
        fs.unlinkSync(imagePath);
        return res.status(400).json({
          success: false,
          message: validationError.message,
        });
      }

      
      const options = {};
      if (req.body.decimalPlaces) {
        options.decimalPlaces = parseInt(req.body.decimalPlaces);
      }
      if (req.body.cents !== undefined) {
        options.cents = req.body.cents === "true";
      }
      if (req.body.documentType) {
        options.documentType = req.body.documentType;
      }
      if (req.body.defaultDateParsing) {
        options.defaultDateParsing = req.body.defaultDateParsing;
      }
      if (req.body.region) {
        options.region = req.body.region;
      }

      
      const result = await ocrAiService.processImage(imagePath, options);

      
      fs.unlinkSync(imagePath);

      res.json({
        success: true,
        message: "Image submitted for processing",
        token: result.token,
        duplicate: result.duplicate,
        duplicateToken: result.duplicateToken,
      });
    } catch (error) {
      console.error("Error submitting image:", error);

      
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: error.message || "Failed to submit image",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  
  async getResult(req, res) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token is required",
        });
      }

      const result = await ocrAiService.getResult(token);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error getting result:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to get result",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  
  async pollResult(req, res) {
    try {
      const { token } = req.params;
      const maxRetries = parseInt(req.query.maxRetries) || 30;
      const intervalMs = parseInt(req.query.interval) || 2000;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token is required",
        });
      }

      const result = await ocrAiService.pollForResult(
        token,
        maxRetries,
        intervalMs
      );

      res.json({
        success: true,
        message: "Processing completed",
        data: result,
      });
    } catch (error) {
      console.error("Error polling result:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to get result",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  
  async getCredit(req, res) {
    try {
      const credit = await ocrAiService.getCredit();

      res.json({
        success: true,
        credit: credit,
      });
    } catch (error) {
      console.error("Error getting credit:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Failed to get credit information",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  
  async getSupportedRegions(req, res) {
    try {
      const regions = ocrAiService.getSupportedRegions();

      res.json({
        success: true,
        regions: regions,
      });
    } catch (error) {
      console.error("Error getting regions:", error);

      res.status(500).json({
        success: false,
        message: "Failed to get supported regions",
      });
    }
  }

  
  async healthCheck(req, res) {
    try {
      
      const credit = await ocrAiService.getCredit();

      res.json({
        success: true,
        message: "OCR AI service is healthy",
        credit: credit,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Health check failed:", error);

      res.status(503).json({
        success: false,
        message: "OCR AI service is unavailable",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  
  async batchProcessOcraiResults(req, res) {
    try {
      const { accepted = [], ignored = [] } = req.body;
      const userId = req.user.id;

      const results = {
        accepted: {
          created: [],
          errors: [],
        },
        ignored: {
          deleted: [],
          errors: [],
        },
      };

      

      for (const item of accepted) {
        const { ocrai_result_id, transactions } = item;

        if (
          !ocrai_result_id ||
          !Array.isArray(transactions) ||
          transactions.length === 0
        ) {
          console.error(
            `[Batch Process] Invalid data for ocrai_result_id ${ocrai_result_id}:`,
            {
              ocrai_result_id,
              hasTransactions: Array.isArray(transactions),
              transactionsLength: transactions?.length,
            }
          );
          results.accepted.errors.push({
            ocrai_result_id,
            error: "ocrai_result_id and transactions array are required",
          });
          continue;
        }

        
        const { data: ocraiResult, error: ocraiError } = await supabase
          .from("ocrai_results")
          .select("*")
          .eq("id", ocrai_result_id)
          .eq("user_id", userId)
          .single();

        if (ocraiError || !ocraiResult) {
          results.accepted.errors.push({
            ocrai_result_id,
            error: "Ocrai result not found or you don't have permission",
          });
          continue;
        }

        
        
        if (
          ocraiResult.ocr_status !== "processed" &&
          ocraiResult.ocr_status !== "corrected"
        ) {
          results.accepted.errors.push({
            ocrai_result_id,
            error: `Cannot create transactions. Status is "${ocraiResult.ocr_status}". Only "processed" or "corrected" status allowed.`,
          });
          continue;
        }

        
        const createdTransactions = [];
        const transactionErrors = [];

        for (let i = 0; i < transactions.length; i++) {
          const tx = transactions[i];
          const {
            wallet_id,
            type,
            amount,
            origin_wallet_id,
            destination_wallet_id,
            category_id,
            notes,
            tags,
            items,
            date,
            name, 
          } = tx;

          
          if (!wallet_id || !type || !amount) {
            const errorMsg = `Missing required fields: wallet_id=${!!wallet_id}, type=${!!type}, amount=${!!amount}`;
            console.error(
              `[Batch Process] Validation error for transaction ${i}:`,
              errorMsg
            );
            transactionErrors.push({
              index: i,
              error: "Wallet ID, type, and amount are required",
              details: errorMsg,
            });
            continue;
          }

          
          const validTypes = ["transfer", "income", "expense"];
          if (!validTypes.includes(type)) {
            transactionErrors.push({
              index: i,
              error:
                "Transaction type must be 'transfer', 'income', or 'expense'",
            });
            continue;
          }

          
          if (amount <= 0) {
            transactionErrors.push({
              index: i,
              error: "Amount must be greater than 0",
            });
            continue;
          }

          
          const { data: wallet, error: walletError } = await supabase
            .from("wallets")
            .select("user_id")
            .eq("id", wallet_id)
            .single();

          if (walletError || !wallet || wallet.user_id !== userId) {
            transactionErrors.push({
              index: i,
              error: "Wallet not found or you don't have permission",
            });
            continue;
          }

          
          if (category_id) {
            const { data: category, error: categoryError } = await supabase
              .from("categories")
              .select("user_id, is_global")
              .eq("id", category_id)
              .single();

            if (categoryError || !category) {
              transactionErrors.push({
                index: i,
                error: "Category not found",
              });
              continue;
            }

            const isAccessible =
              category.is_global || category.user_id === userId;
            if (!isAccessible) {
              transactionErrors.push({
                index: i,
                error: "Invalid category ID",
              });
              continue;
            }
          }

          
          
          let dateToUse = date;
          let isFromTabscanner = false;

          if (
            !dateToUse &&
            ocraiResult.extracted_data &&
            ocraiResult.extracted_data.date
          ) {
            dateToUse = ocraiResult.extracted_data.date;
            isFromTabscanner = true;
          }

          let normalizedDate =
            dateToUse || new Date().toISOString().split("T")[0];
          if (dateToUse) {
            try {
              const dateObj = new Date(dateToUse);
              const today = new Date();
              today.setHours(23, 59, 59, 999); 

              
              if (dateObj > today) {
                normalizedDate = new Date().toISOString().split("T")[0];
              } else {
                
                
                if (!isFromTabscanner) {
                  const fiveYearsAgo = new Date();
                  fiveYearsAgo.setFullYear(today.getFullYear() - 5);
                  if (dateObj < fiveYearsAgo) {
                    normalizedDate = new Date().toISOString().split("T")[0];
                  } else {
                    normalizedDate = dateObj.toISOString().split("T")[0];
                  }
                } else {
                  
                  normalizedDate = dateObj.toISOString().split("T")[0];
                }
              }
            } catch (e) {
              normalizedDate = new Date().toISOString().split("T")[0];
            }
          } else {
          }

          
          
          const transactionName = name && name.trim() ? name.trim() : null;

          const transactionData = {
            wallet_id,
            user_id: userId,
            type,
            amount: parseFloat(amount),
            date: normalizedDate,
            origin_wallet_id: type === "transfer" ? origin_wallet_id : null,
            destination_wallet_id:
              type === "transfer" ? destination_wallet_id : null,
            category_id: category_id || null,
            name: transactionName, 
            notes: notes || null, 
            tags: tags || null, 
            items: items || null, 
            file_id: ocraiResult.file_id || null,
            recurrence_id: null,
          };

          

          const { data: transaction, error: transactionError } = await supabase
            .from("transactions")
            .insert(transactionData)
            .select()
            .single();

          if (transactionError) {
            console.error(
              `[Batch Process] Error creating transaction ${i} for ocrai ${ocrai_result_id}:`,
              transactionError
            );
            transactionErrors.push({
              index: i,
              error: transactionError.message || "Failed to create transaction",
              details: transactionError,
            });
            continue;
          }

          
          if (type === "transfer") {
            
            const { error: originError } = await supabase.rpc(
              "update_wallet_balance",
              {
                p_wallet_id: origin_wallet_id,
                p_amount: -parseFloat(amount),
              }
            );

            if (originError) {
              console.error("Error updating origin wallet:", originError);
              await supabase
                .from("transactions")
                .delete()
                .eq("id", transaction.id);
              transactionErrors.push({
                index: i,
                error: "Failed to update origin wallet balance",
              });
              continue;
            }

            
            const { error: destError } = await supabase.rpc(
              "update_wallet_balance",
              {
                p_wallet_id: destination_wallet_id,
                p_amount: parseFloat(amount),
              }
            );

            if (destError) {
              console.error("Error updating destination wallet:", destError);
              await supabase
                .from("transactions")
                .delete()
                .eq("id", transaction.id);
              await supabase.rpc("update_wallet_balance", {
                p_wallet_id: origin_wallet_id,
                p_amount: parseFloat(amount), 
              });
              transactionErrors.push({
                index: i,
                error: "Failed to update destination wallet balance",
              });
              continue;
            }
          } else if (type === "income") {
            const { error: balanceError } = await supabase.rpc(
              "update_wallet_balance",
              {
                p_wallet_id: wallet_id,
                p_amount: parseFloat(amount),
              }
            );

            if (balanceError) {
              console.error("Error updating wallet balance:", balanceError);
              await supabase
                .from("transactions")
                .delete()
                .eq("id", transaction.id);
              transactionErrors.push({
                index: i,
                error: "Failed to update wallet balance",
              });
              continue;
            }
          } else if (type === "expense") {
            const { error: balanceError } = await supabase.rpc(
              "update_wallet_balance",
              {
                p_wallet_id: wallet_id,
                p_amount: -parseFloat(amount),
              }
            );

            if (balanceError) {
              console.error("Error updating wallet balance:", balanceError);
              await supabase
                .from("transactions")
                .delete()
                .eq("id", transaction.id);
              transactionErrors.push({
                index: i,
                error: "Failed to update wallet balance",
              });
              continue;
            }
          }

          
          const { data: fullTransaction, error: fetchError } = await supabase
            .from("transactions")
            .select(
              `
              *,
              wallet:wallets!wallet_id(id, name, currency),
              origin_wallet:wallets!origin_wallet_id(id, name, currency),
              destination_wallet:wallets!destination_wallet_id(id, name, currency),
              category:categories(id, name, color, icon),
              file:files(id, file_url, file_name, file_type)
            `
            )
            .eq("id", transaction.id)
            .single();

          if (!fetchError && fullTransaction) {
            
            if (fullTransaction.file && fullTransaction.file.file_url) {
              const bucket = config.SUPABASE_STORAGE_BUCKET || "main";
              let storagePath = fullTransaction.file.file_url;

              if (
                !storagePath.startsWith("http://") &&
                !storagePath.startsWith("https://")
              ) {
                const { data: signedUrlData, error: signedUrlError } =
                  await supabase.storage
                    .from(bucket)
                    .createSignedUrl(storagePath, 3600);

                if (!signedUrlError && signedUrlData?.signedUrl) {
                  fullTransaction.file.file_url = signedUrlData.signedUrl;
                }
              }
            }

            createdTransactions.push(fullTransaction);
          } else {
            
            createdTransactions.push(transaction);
          }
        }

        

        if (createdTransactions.length > 0) {
          
          
          const shouldUpdateStatus = ocraiResult.ocr_status === "processed";

          if (shouldUpdateStatus) {
          } else {
          }

          const updateData = {};
          if (shouldUpdateStatus) {
            updateData.ocr_status = "corrected";
          }
          
          if (!ocraiResult.transaction_id && createdTransactions.length === 1) {
            updateData.transaction_id = createdTransactions[0].id;
          }

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from("ocrai_results")
              .update(updateData)
              .eq("id", ocrai_result_id);

            if (updateError) {
              console.error(
                `[Batch Process] Error updating ocrai_result ${ocrai_result_id} status:`,
                updateError
              );
              results.accepted.errors.push({
                ocrai_result_id,
                error: "Failed to update ocrai result status",
                details: updateError,
              });
              continue;
            }
          }

          results.accepted.created.push({
            ocrai_result_id,
            transactions: createdTransactions,
            errors:
              transactionErrors.length > 0 ? transactionErrors : undefined,
          });
        } else {
          console.error(
            `[Batch Process] ❌ No transactions created for ocrai_result_id ${ocrai_result_id}`,
            {
              transactionErrors,
            }
          );
          results.accepted.errors.push({
            ocrai_result_id,
            error: "No transactions were created",
            transaction_errors: transactionErrors,
          });
        }
      }

      
      for (const ocrai_result_id of ignored) {
        if (!ocrai_result_id || typeof ocrai_result_id !== "number") {
          results.ignored.errors.push({
            ocrai_result_id,
            error: "Invalid ocrai_result_id",
          });
          continue;
        }

        
        const { data: ocraiResult, error: ocraiError } = await supabase
          .from("ocrai_results")
          .select("*")
          .eq("id", ocrai_result_id)
          .eq("user_id", userId)
          .single();

        if (ocraiError || !ocraiResult) {
          results.ignored.errors.push({
            ocrai_result_id,
            error: "Ocrai result not found or you don't have permission",
          });
          continue;
        }

        
        if (ocraiResult.ocr_status !== "processed") {
          results.ignored.errors.push({
            ocrai_result_id,
            error: `Cannot delete. Status is "${ocraiResult.ocr_status}", expected "processed"`,
          });
          continue;
        }

        
        const { error: deleteError } = await supabase
          .from("ocrai_results")
          .delete()
          .eq("id", ocrai_result_id)
          .eq("user_id", userId);

        if (deleteError) {
          console.error("Error deleting ocrai result:", deleteError);
          results.ignored.errors.push({
            ocrai_result_id,
            error: "Failed to delete ocrai result",
          });
          continue;
        }

        results.ignored.deleted.push(ocrai_result_id);
      }

      
      const summary = {
        accepted: {
          total: accepted.length,
          successful: results.accepted.created.length,
          failed: results.accepted.errors.length,
        },
        ignored: {
          total: ignored.length,
          successful: results.ignored.deleted.length,
          failed: results.ignored.errors.length,
        },
      };

      res.json({
        success: true,
        message: `Processed ${accepted.length} accepted and ${ignored.length} ignored`,
        data: {
          results,
          summary,
        },
      });
    } catch (error) {
      console.error("Error in batchProcessOcraiResults:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to process ocrai results",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  
  async createTransactionsFromOcrai(req, res) {
    try {
      const { ocrai_result_id, transactions } = req.body;
      const userId = req.user.id;

      
      const userLanguage = await getUserLanguage(userId, supabase);

      if (
        !ocrai_result_id ||
        !Array.isArray(transactions) ||
        transactions.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "ocrai_result_id and transactions array are required",
        });
      }

      
      const { data: ocraiResult, error: ocraiError } = await supabase
        .from("ocrai_results")
        .select("*")
        .eq("id", ocrai_result_id)
        .eq("user_id", userId)
        .single();

      if (ocraiError || !ocraiResult) {
        return res.status(404).json({
          success: false,
          message: "Ocrai result not found or you don't have permission",
        });
      }

      if (ocraiResult.ocr_status !== "processed") {
        return res.status(400).json({
          success: false,
          message: `Cannot create transactions. Ocrai result status is "${ocraiResult.ocr_status}", expected "processed"`,
        });
      }

      
      const createdTransactions = [];
      const errors = [];

      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        const {
          wallet_id,
          type,
          amount,
          currency, 
          origin_wallet_id,
          destination_wallet_id,
          category_id,
          name, 
          notes,
          tags,
          items,
          date,
        } = tx;

        
        if (!wallet_id || !type || !amount) {
          errors.push({
            index: i,
            error: "Wallet ID, type, and amount are required",
          });
          continue;
        }

        
        const validTypes = ["transfer", "income", "expense"];
        if (!validTypes.includes(type)) {
          errors.push({
            index: i,
            error:
              "Transaction type must be 'transfer', 'income', or 'expense'",
          });
          continue;
        }

        
        if (amount <= 0) {
          errors.push({
            index: i,
            error: "Amount must be greater than 0",
          });
          continue;
        }

        
        const { data: wallet, error: walletError } = await supabase
          .from("wallets")
          .select("user_id, currency, balance")
          .eq("id", wallet_id)
          .single();

        if (walletError || !wallet || wallet.user_id !== userId) {
          errors.push({
            index: i,
            error: "Wallet not found or you don't have permission",
          });
          continue;
        }

        
        let finalAmount = parseFloat(amount);
        let currencyConversion = null;
        const ocrCurrency = currency?.toUpperCase() || null;
        const walletCurrency = wallet.currency;

        if (ocrCurrency && ocrCurrency !== walletCurrency) {
          
          try {
            const conversion = await convertCurrency(
              parseFloat(amount),
              ocrCurrency,
              walletCurrency
            );

            finalAmount = conversion.convertedAmount;
            currencyConversion = {
              rate: parseFloat(conversion.rate),
              original_amount: parseFloat(amount),
              original_currency: ocrCurrency,
              converted_amount: finalAmount,
              destination_currency: walletCurrency,
            };

          } catch (conversionError) {
            console.error("Currency conversion failed:", conversionError);
            errors.push({
              index: i,
              error: `Currency conversion failed: ${conversionError.message}`,
              details: {
                ocrCurrency,
                walletCurrency,
                amount,
              },
            });
            continue;
          }
        }

        
        if (category_id) {
          const { data: category, error: categoryError } = await supabase
            .from("categories")
            .select("user_id, is_global")
            .eq("id", category_id)
            .single();

          if (categoryError || !category) {
            errors.push({
              index: i,
              error: "Category not found",
            });
            continue;
          }

          const isAccessible =
            category.is_global || category.user_id === userId;
          if (!isAccessible) {
            errors.push({
              index: i,
              error: "Invalid category ID",
            });
            continue;
          }
        }

        
        
        const transactionName = name && name.trim() ? name.trim() : null;

        
        let dateToUse = date;
        if (
          !dateToUse &&
          ocraiResult.extracted_data &&
          ocraiResult.extracted_data.date
        ) {
          dateToUse = ocraiResult.extracted_data.date;
        }
        const finalDate = dateToUse || new Date().toISOString().split("T")[0];

        const transactionData = {
          wallet_id,
          user_id: userId,
          type,
          amount: finalAmount, 
          date: finalDate,
          origin_wallet_id: type === "transfer" ? origin_wallet_id : null,
          destination_wallet_id:
            type === "transfer" ? destination_wallet_id : null,
          category_id: category_id || null,
          name: transactionName, 
          notes: currencyConversion
            ? `${notes || ""} | ${getCurrencyConversionNote(
                currencyConversion.original_amount,
                currencyConversion.original_currency,
                currencyConversion.rate,
                userLanguage
              )}`.trim()
            : notes || null,
          tags: tags || null,
          items: items || null, 
          file_id: ocraiResult.file_id || null,
          recurrence_id: null,
          
          exchange_rate: currencyConversion ? currencyConversion.rate : null,
          original_amount: currencyConversion
            ? currencyConversion.original_amount
            : null,
          original_currency: currencyConversion
            ? currencyConversion.original_currency
            : null,
          converted_amount: currencyConversion
            ? currencyConversion.converted_amount
            : null,
          destination_currency: currencyConversion
            ? currencyConversion.destination_currency
            : null,
        };

        
        const { data: transaction, error: transactionError } = await supabase
          .from("transactions")
          .insert(transactionData)
          .select()
          .single();

        if (transactionError) {
          console.error(`Error creating transaction ${i}:`, transactionError);
          errors.push({
            index: i,
            error: transactionError.message || "Failed to create transaction",
          });
          continue;
        }

        
        if (type === "transfer") {
          
          const { error: originError } = await supabase.rpc(
            "update_wallet_balance",
            {
              p_wallet_id: origin_wallet_id,
              p_amount: -finalAmount, 
            }
          );

          if (originError) {
            console.error("Error updating origin wallet:", originError);
            
            await supabase
              .from("transactions")
              .delete()
              .eq("id", transaction.id);
            errors.push({
              index: i,
              error: "Failed to update origin wallet balance",
            });
            continue;
          }

          
          const { error: destError } = await supabase.rpc(
            "update_wallet_balance",
            {
              p_wallet_id: destination_wallet_id,
              p_amount: finalAmount, 
            }
          );

          if (destError) {
            console.error("Error updating destination wallet:", destError);
            
            await supabase
              .from("transactions")
              .delete()
              .eq("id", transaction.id);
            await supabase.rpc("update_wallet_balance", {
              p_wallet_id: origin_wallet_id,
              p_amount: finalAmount, 
            });
            errors.push({
              index: i,
              error: "Failed to update destination wallet balance",
            });
            continue;
          }
        } else if (type === "income") {
          const { error: balanceError } = await supabase.rpc(
            "update_wallet_balance",
            {
              p_wallet_id: wallet_id,
              p_amount: finalAmount, 
            }
          );

          if (balanceError) {
            console.error("Error updating wallet balance:", balanceError);
            await supabase
              .from("transactions")
              .delete()
              .eq("id", transaction.id);
            errors.push({
              index: i,
              error: "Failed to update wallet balance",
            });
            continue;
          }
        } else if (type === "expense") {
          const { error: balanceError } = await supabase.rpc(
            "update_wallet_balance",
            {
              p_wallet_id: wallet_id,
              p_amount: -finalAmount, 
            }
          );

          if (balanceError) {
            console.error("Error updating wallet balance:", balanceError);
            await supabase
              .from("transactions")
              .delete()
              .eq("id", transaction.id);
            errors.push({
              index: i,
              error: "Failed to update wallet balance",
            });
            continue;
          }
        }

        createdTransactions.push(transaction);
      }

      
      if (createdTransactions.length > 0) {
        const { error: updateError } = await supabase
          .from("ocrai_results")
          .update({
            ocr_status: "corrected",
            transaction_id:
              createdTransactions.length === 1
                ? createdTransactions[0].id
                : null, 
          })
          .eq("id", ocrai_result_id);

        if (updateError) {
          console.error("Error updating ocrai_result status:", updateError);
          
        }
      }

      
      const successMessage =
        createdTransactions.length === transactions.length
          ? translate("ocr", "allCreated", userLanguage)
          : translate("ocr", "partialSuccess", userLanguage);

      res.json({
        success: true,
        message: `${successMessage} (${createdTransactions.length}/${transactions.length})`,
        data: {
          created: createdTransactions,
          errors: errors.length > 0 ? errors : undefined,
          ocrai_result_id: ocrai_result_id,
        },
      });
    } catch (error) {
      console.error("Error creating transactions from ocrai:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create transactions",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  
  async deleteOcraiResult(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      
      const { data: ocraiResult, error: ocraiError } = await supabase
        .from("ocrai_results")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (ocraiError || !ocraiResult) {
        return res.status(404).json({
          success: false,
          message: "Ocrai result not found or you don't have permission",
        });
      }

      
      if (ocraiResult.ocr_status !== "processed") {
        return res.status(400).json({
          success: false,
          message: `Cannot delete. Ocrai result status is "${ocraiResult.ocr_status}". Only results with status "processed" can be deleted.`,
        });
      }

      
      const { error: deleteError } = await supabase
        .from("ocrai_results")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (deleteError) {
        console.error("Error deleting ocrai result:", deleteError);
        return res.status(500).json({
          success: false,
          message: "Failed to delete ocrai result",
        });
      }

      res.json({
        success: true,
        message: "Ocrai result deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting ocrai result:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete ocrai result",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  
  async getOcraiResults(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const { data: results, error } = await supabase
        .from("ocrai_results")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error fetching ocrai results:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch ocrai results",
        });
      }

      res.json({
        success: true,
        data: {
          results: results || [],
          count: results?.length || 0,
        },
      });
    } catch (error) {
      console.error("Error in getOcraiResults:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get ocrai results",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  
  async getPendingOcraiResults(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const { data: results, error } = await supabase
        .from("ocrai_results")
        .select(
          "id, user_id, file_id, transaction_id, raw_text, extracted_data, corrected_data, ocr_status, created_at, updated_at"
        )
        .eq("user_id", userId)
        .eq("ocr_status", "processed")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error fetching pending ocrai results:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch pending ocrai results",
        });
      }

      
      if (results && results.length > 0) {
        const resultsWithNullCorrected = results.filter(
          (r) => !r.corrected_data
        );
        if (resultsWithNullCorrected.length > 0) {
        }
      }

      
      const categories = await ocrAiService.getUserCategories(userId);

      
      const fileIds = results.filter((r) => r.file_id).map((r) => r.file_id);
      const fileUrlsMap = new Map();

      if (fileIds.length > 0) {
        const { data: fileRecords } = await supabase
          .from("files")
          .select("id, file_url")
          .in("id", fileIds);

        if (fileRecords) {
          const bucket = config.SUPABASE_STORAGE_BUCKET || "main";
          
          for (const file of fileRecords) {
            if (!file.file_url) continue;

            
            let storagePath = file.file_url;

            if (storagePath.includes("/storage/v1/object/public/")) {
              
              const urlParts = storagePath.split("/storage/v1/object/public/");
              if (urlParts.length > 1) {
                const afterBucket = urlParts[1].split("/").slice(1).join("/"); 
                storagePath = afterBucket;
              }
            } else if (storagePath.includes("/object/public/")) {
              const urlParts = storagePath.split("/object/public/");
              if (urlParts.length > 1) {
                const afterBucket = urlParts[1].split("/").slice(1).join("/");
                storagePath = afterBucket;
              }
            }

            const { data: signedUrlData, error: signedUrlError } =
              await supabase.storage
                .from(bucket)
                .createSignedUrl(storagePath, 3600); 

            if (!signedUrlError && signedUrlData?.signedUrl) {
              fileUrlsMap.set(file.id, signedUrlData.signedUrl);
            } else {
              console.error(
                `[Pending] ❌ Error generating signed URL for file ${file.id}:`,
                {
                  error: signedUrlError,
                  storagePath: storagePath,
                  originalFileUrl: file.file_url,
                }
              );

              
              if (
                file.file_url.startsWith("http://") ||
                file.file_url.startsWith("https://")
              ) {
                fileUrlsMap.set(file.id, file.file_url);
              }
            }
          }
        }
      }

      const enrichedResults = (results || [])
        .map((result) => {
          
          if (result.file_id && fileUrlsMap.has(result.file_id)) {
            result.file_url = fileUrlsMap.get(result.file_id);
          }

          
          if (!result.corrected_data) {
            if (result.extracted_data && result.extracted_data.hasData) {
              
              result.corrected_data = {
                type: "expense",
                amount: result.extracted_data.total || 0,
                date:
                  result.extracted_data.date ||
                  new Date().toISOString().split("T")[0],
                merchant: result.extracted_data.merchantName || null,
                notes: result.raw_text
                  ? result.raw_text.substring(0, 200)
                  : null, 
                tags: null,
                items: result.extracted_data.items || [],
                category_id: null,
                confidence: 0.3, 
              };
            } else if (result.raw_text && result.raw_text.trim().length > 0) {
              
              result.corrected_data = {
                type: "expense",
                amount: 0,
                date: new Date().toISOString().split("T")[0],
                merchant: null,
                notes: result.raw_text.substring(0, 500), 
                tags: null,
                items: [],
                category_id: null,
                confidence: 0.1, 
              };
            }
          }

          
          if (result.corrected_data && result.corrected_data.category_id) {
            const category = categories.find(
              (cat) => cat.id === result.corrected_data.category_id
            );
            if (category) {
              result.corrected_data.category_name = category.name;
              result.corrected_data.category_icon = category.icon;
              result.corrected_data.category_color = category.color;
            }
          }

          return result;
        })
        
        .filter((result) => {
          
          return (
            result.corrected_data ||
            result.extracted_data ||
            (result.raw_text && result.raw_text.trim().length > 0)
          );
        });

      
      if (enrichedResults.length === 0) {
        return res.json({
          success: true,
          data: {
            results: [],
            count: 0,
            message: "No pending results found",
          },
        });
      }

      

      res.json({
        success: true,
        data: {
          results: enrichedResults,
          count: enrichedResults.length,
          
          
          
          
          
          
        },
      });
    } catch (error) {
      console.error("Error in getPendingOcraiResults:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get pending ocrai results",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  
  async getOcraiResultById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const { data: result, error } = await supabase
        .from("ocrai_results")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (error || !result) {
        return res.status(404).json({
          success: false,
          message: "Ocrai result not found",
        });
      }

      res.json({
        success: true,
        data: {
          result,
        },
      });
    } catch (error) {
      console.error("Error in getOcraiResultById:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get ocrai result",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  
  async testRawResponse(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      const imagePath = req.file.path;

      
      try {
        ocrAiService.validateImageFile(imagePath);
      } catch (validationError) {
        fs.unlinkSync(imagePath);
        return res.status(400).json({
          success: false,
          message: validationError.message,
        });
      }

      
      const result = await ocrAiService.processAndGetResult(imagePath);

      
      fs.unlinkSync(imagePath);

      
      res.json({
        success: true,
        message: "Raw OCR response",
        rawResponse: result,
        analysis: {
          status: result.status,
          hasResultData: !!result.result,
          resultKeys: result.result ? Object.keys(result.result) : [],
          total: result.result?.total,
          establishment: result.result?.establishment,
          lineItemsCount: result.result?.lineItems?.length || 0,
          hasAnyText: !!(
            result.result?.establishment ||
            result.result?.lineItems?.length > 0 ||
            result.result?.total
          ),
        },
      });
    } catch (error) {
      console.error("Test endpoint error:", error);

      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
}

const ocrAiController = new OcrAiController();

export const processImage = [
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  ocrAiController.processImage.bind(ocrAiController),
];
export const submitImage = [
  upload.single("image"),
  ocrAiController.submitImage.bind(ocrAiController),
];
export const getResult = ocrAiController.getResult.bind(ocrAiController);
export const pollResult = ocrAiController.pollResult.bind(ocrAiController);
export const getCredit = ocrAiController.getCredit.bind(ocrAiController);
export const getSupportedRegions =
  ocrAiController.getSupportedRegions.bind(ocrAiController);
export const healthCheck = ocrAiController.healthCheck.bind(ocrAiController);
export const batchProcessOcraiResults =
  ocrAiController.batchProcessOcraiResults.bind(ocrAiController);
export const createTransactionsFromOcrai =
  ocrAiController.createTransactionsFromOcrai.bind(ocrAiController);
export const deleteOcraiResult =
  ocrAiController.deleteOcraiResult.bind(ocrAiController);
export const getPendingOcraiResults =
  ocrAiController.getPendingOcraiResults.bind(ocrAiController);
export const getOcraiResults =
  ocrAiController.getOcraiResults.bind(ocrAiController);
export const getOcraiResultById =
  ocrAiController.getOcraiResultById.bind(ocrAiController);
export const testRawResponse = [
  upload.single("image"),
  ocrAiController.testRawResponse.bind(ocrAiController),
];

function extractStructuredData(ocrResult) {
  if (!ocrResult) {
    return {
      merchantName: null,
      total: null,
      items: [],
      date: null,
      hasData: false,
    };
  }

  
  const sanitizeOCRItems = (items) => {
    const pickName = (item) => {
      const candidates = [
        item.descClean,
        item.desc,
        item.productCode,
        ...(item.supplementaryLineItems?.above || []).map(
          (v) => v.descClean || v.desc
        ),
        ...(item.supplementaryLineItems?.below || []).map(
          (v) => v.descClean || v.desc
        ),
      ];

      const looksLikeQty = (text) => /^\s*\d|^\s*0[\s\.,xX]/.test(text || "");

      for (const cand of candidates) {
        if (!cand) continue;
        const trimmed = String(cand).trim();
        if (looksLikeQty(trimmed)) continue;
        if (/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(trimmed)) return trimmed;
        if (trimmed.length > 1) return trimmed;
      }

      return "Item";
    };

    return (items || []).map((item) => {
      return {
        name: pickName(item),
      };
    });
  };

  
  const items =
    ocrResult.lineItems && ocrResult.lineItems.length > 0
      ? sanitizeOCRItems(ocrResult.lineItems)
      : [];

  return {
    merchantName: ocrResult.establishment || null,
    total: parseFloat(ocrResult.total) || null,
    subtotal: parseFloat(ocrResult.subTotal) || null,
    tax: parseFloat(ocrResult.tax) || null,
    items: items,
    date: ocrResult.date || null,
    address: ocrResult.address || null,
    paymentMethod: ocrResult.paymentMethod || null,
    hasData: !!(ocrResult.establishment || ocrResult.total || items.length > 0),
    confidence: {
      total: ocrResult.totalConfidence || 0,
      establishment: ocrResult.establishmentConfidence || 0,
    },
  };
}

function formatExtractedText(ocrResult) {
  if (!ocrResult) {
    return "No text found";
  }

  let textParts = [];

  
  if (ocrResult.establishment) {
    textParts.push(`Store: ${ocrResult.establishment}`);
  }

  
  if (ocrResult.date) {
    textParts.push(`Date: ${ocrResult.date}`);
  }

  
  if (ocrResult.address) {
    textParts.push(`Address: ${ocrResult.address}`);
  }

  
  if (ocrResult.phoneNumber) {
    textParts.push(`Phone: ${ocrResult.phoneNumber}`);
  }

  
  if (ocrResult.lineItems && ocrResult.lineItems.length > 0) {
    textParts.push("\nItems:");
    ocrResult.lineItems.forEach((item, index) => {
      const desc = item.descClean || item.desc || "Item";
      const price = item.lineTotal || item.price || "";
      const qty = item.qty > 0 ? `${item.qty}x ` : "";
      textParts.push(`${index + 1}. ${qty}${desc} ${price ? "$" + price : ""}`);
    });
  }

  
  if (ocrResult.subTotal) {
    textParts.push(`\nSubtotal: $${ocrResult.subTotal}`);
  }
  if (ocrResult.tax) {
    textParts.push(`Tax: $${ocrResult.tax}`);
  }
  if (ocrResult.total) {
    textParts.push(`Total: $${ocrResult.total}`);
  }

  
  if (ocrResult.paymentMethod) {
    textParts.push(`Payment: ${ocrResult.paymentMethod}`);
  }

  
  if (textParts.length === 0) {
    return "No readable text found in image";
  }

  return textParts.join("\n");
}
