import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import OpenAI from "openai";
import crypto from "crypto";
import { supabase } from "./supabase.service.js";
import { config } from "../config/env.js";

class OcrAiService {
  constructor() {
    this.apiKey = process.env.OCR_API_KEY;
    this.baseUrl = "https://api.tabscanner.com";
    this.apiVersion = "2";

    if (!this.apiKey) {
      throw new Error("OCR_API_KEY environment variable is required");
    }

    
    if (config.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: config.OPENAI_API_KEY,
      });
    } else {
      console.warn("OPENAI_API_KEY not found. GPT-4o features will be disabled.");
      this.openai = null;
    }
  }

  
  async processImage(imagePath, options = {}) {
    try {
      const formData = new FormData();
      formData.append("file", fs.createReadStream(imagePath));

      
      if (options.decimalPlaces) {
        formData.append("decimalPlaces", options.decimalPlaces.toString());
      }
      if (options.cents !== undefined) {
        formData.append("cents", options.cents.toString());
      }
      if (options.documentType) {
        formData.append("documentType", options.documentType);
      }
      if (options.defaultDateParsing) {
        formData.append("defaultDateParsing", options.defaultDateParsing);
      }
      if (options.region) {
        formData.append("region", options.region);
      }

      const response = await axios.post(
        `${this.baseUrl}/api/${this.apiVersion}/process`,
        formData,
        {
          headers: {
            apikey: this.apiKey,
            ...formData.getHeaders(),
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error("Error processing image:", error);
      throw this.handleApiError(error);
    }
  }

  
  async getResult(token) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/result/${token}`, {
        headers: {
          apikey: this.apiKey,
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error getting result:", error);
      throw this.handleApiError(error);
    }
  }

  
  async pollForResult(token, maxRetries = 30, intervalMs = 2000) {
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        const result = await this.getResult(token);

        if (result.status === "done") {
          return result;
        } else if (result.status === "failed") {
          throw new Error(
            `OCR processing failed: ${result.message || "Unknown error"}`,
          );
        }

        
        await this.sleep(intervalMs);
        attempts++;
      } catch (error) {
        if (
          error.response?.status === 404 ||
          error.response?.data?.code === 402
        ) {
          
          await this.sleep(intervalMs);
          attempts++;
          continue;
        }
        throw error;
      }
    }

    throw new Error(
      `Timeout: Result not available after ${maxRetries} attempts`,
    );
  }

  
  async processAndGetResult(imagePath, options = {}) {
    try {
      
      const processResult = await this.processImage(imagePath, options);

      if (!processResult.success) {
        throw new Error(`Failed to submit image: ${processResult.message}`);
      }

      const token = processResult.token;

      
      const result = await this.pollForResult(token);

      return result;
    } catch (error) {
      console.error("Error in processAndGetResult:", error);
      throw error;
    }
  }

  
  async getCredit() {
    try {
      const response = await axios.get(`${this.baseUrl}/credit`, {
        headers: {
          apikey: this.apiKey,
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error getting credit:", error);
      throw this.handleApiError(error);
    }
  }

  
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  
  handleApiError(error) {
    if (error.response) {
      const { status, data } = error.response;
      const errorMessages = {
        400: "API key not found or invalid request",
        401: "Not enough credit",
        402: "Token not found",
        403: "No file detected",
        404: "Multiple files detected or resource not found",
        405: "Unsupported file type",
        406: "Form parser error",
        407: "Unsupported file extension",
        408: "File system error",
        500: "OCR processing failed",
        510: "Server error",
        520: "Database connection error",
        521: "Database query error",
      };

      const message =
        data?.message || errorMessages[status] || `HTTP ${status} error`;
      return new Error(`Tabscanner API Error: ${message}`);
    } else if (error.request) {
      return new Error("Network error: Unable to reach Tabscanner API");
    } else {
      return new Error(`Request error: ${error.message}`);
    }
  }

  
  validateImageFile(imagePath) {
    if (!fs.existsSync(imagePath)) {
      throw new Error("Image file does not exist");
    }

    const allowedExtensions = [".jpg", ".jpeg", ".png"];
    const fileExtension = imagePath
      .toLowerCase()
      .substring(imagePath.lastIndexOf("."));

    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error(
        "Invalid file type. Only JPG and PNG files are supported",
      );
    }

    const stats = fs.statSync(imagePath);
    if (stats.size === 0) {
      throw new Error("Image file is empty");
    }

    return true;
  }

  
  getSupportedRegions() {
    return [
      { code: "ar", name: "Argentina" },
      { code: "au", name: "Australia" },
      { code: "be", name: "Belgium" },
      { code: "br", name: "Brazil" },
      { code: "ca", name: "Canada" },
      { code: "cl", name: "Chile" },
      { code: "co", name: "Colombia" },
      { code: "fr", name: "France" },
      { code: "de", name: "Germany" },
      { code: "gr", name: "Greece" },
      { code: "hk", name: "Hong Kong" },
      { code: "in", name: "India" },
      { code: "id", name: "Indonesia" },
      { code: "ie", name: "Ireland" },
      { code: "it", name: "Italy" },
      { code: "ja", name: "Japan" },
      { code: "ke", name: "Kenya" },
      { code: "my", name: "Malaysia" },
      { code: "mx", name: "Mexico" },
      { code: "nz", name: "New Zealand" },
      { code: "pa", name: "Paraguay" },
      { code: "pe", name: "Peru" },
      { code: "ph", name: "Philippines" },
      { code: "sg", name: "Singapore" },
      { code: "za", name: "South Africa" },
      { code: "es", name: "Spain" },
      { code: "se", name: "Sweden" },
      { code: "ch", name: "Switzerland" },
      { code: "to", name: "Tonga" },
      { code: "ae", name: "UAE" },
      { code: "gb", name: "United Kingdom" },
      { code: "uy", name: "Uruguay" },
      { code: "us", name: "USA" },
      { code: "vn", name: "Vietnam" },
    ];
  }

  
  async getUserCategories(userId) {
    try {
      const { data: categories, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true) 
        .or(`is_global.eq.true,user_id.eq.${userId}`)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        throw new Error("Failed to fetch categories");
      }

      return categories || [];
    } catch (error) {
      console.error("Error in getUserCategories:", error);
      throw error;
    }
  }

  
  async analyzeReceiptWithGPT4o(receiptData, rawText, categories) {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      
      const sanitizeItems = (items) => {
        return (items || []).map((item) => {
          const name = (item.name || "").trim() || "Item";
          let quantity = item.quantity;
          let price = item.price;
          
          
          if (quantity !== undefined && quantity !== null) {
            quantity = parseFloat(quantity);
            if (isNaN(quantity) || quantity < 0) quantity = 1;
            if (quantity > 1000) quantity = 1000; 
          } else {
            quantity = 1; 
          }
          
          
          if (price !== undefined && price !== null) {
            price = parseFloat(price);
            if (isNaN(price) || price < 0) price = null;
          } else {
            price = null;
          }
          
          const sanitized = { name };
          if (quantity !== undefined) sanitized.quantity = quantity;
          if (price !== null && price !== undefined) sanitized.price = price;
          
          return sanitized;
        });
      };

      
      const categoriesList = categories
        .map((cat) => `- ${cat.name} (ID: ${cat.id})`)
        .join("\n");

      
      const systemPrompt = `You are a financial transaction analyzer. Your task is to analyze receipt data and extract transaction information, including categorizing it based on the available categories.

Available categories:
${categoriesList}

Analyze the receipt data and return a JSON object with the following structure:
{
  "category_id": <integer category ID that best matches the transaction, or null if none match>,
  "type": "expense" or "income" (based on the receipt),
  "amount": <numeric total amount>,
  "date": <date string in YYYY-MM-DD format>,
  "merchant": <merchant/establishment name>,
  "notes": <brief description of the transaction>,
  "tags": <comma-separated relevant tags>,
  "items": [
    {
      "name": <string item name>,
      "price": <numeric line total or unit price>,
      "quantity": <integer quantity>
    }
  ],
  "confidence": <0-1 score indicating how confident you are in the categorization>
}

Rules:
- Always return valid JSON
- Match the category based on the merchant name, items purchased, and transaction context
- If no category matches well, set category_id to null
- For expenses, use negative amounts or set type to "expense"
- Extract the date from the receipt, default to today if not found
- Generate meaningful notes summarizing the transaction
- Return confidence as a number between 0 and 1
- Include the list of items with name, price (line total or unit), and quantity. If items are not clear, infer from receipt data or leave an empty array`;

      const userPrompt = `Receipt Data:
${JSON.stringify(receiptData, null, 2)}

Raw Text:
${rawText}

Please analyze this receipt and return the transaction data as JSON.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const responseContent = completion.choices[0].message.content;
      const analyzedData = JSON.parse(responseContent);

      
      const amount = Math.abs(parseFloat(analyzedData.amount) || receiptData.total || 0);
      const type = analyzedData.type || "expense";
      const itemsRaw =
        Array.isArray(analyzedData.items) && analyzedData.items.length > 0
          ? analyzedData.items
          : receiptData.items || [];
      const items = sanitizeItems(itemsRaw);

      return {
        category_id: analyzedData.category_id || null,
        type: type.toLowerCase(), 
        amount: amount, 
        date: analyzedData.date || receiptData.date || new Date().toISOString().split("T")[0],
        merchant: analyzedData.merchant || receiptData.merchantName || null,
        notes: analyzedData.notes || null,
        tags: analyzedData.tags || null,
        items: items,
        confidence: parseFloat(analyzedData.confidence) || 0.5,
      };
    } catch (error) {
      console.error("Error analyzing receipt with GPT-4o:", error);
      throw new Error(`GPT-4o analysis failed: ${error.message}`);
    }
  }

  
  createReceiptFingerprint(receiptData) {
    if (!receiptData || !receiptData.hasData) {
      return null;
    }

    
    const normalized = {
      merchant: (receiptData.merchantName || "").trim().toLowerCase(),
      total: receiptData.total ? Math.round(receiptData.total * 100) / 100 : null, 
      subtotal: receiptData.subtotal ? Math.round(receiptData.subtotal * 100) / 100 : null,
      tax: receiptData.tax ? Math.round(receiptData.tax * 100) / 100 : null,
      date: receiptData.date || null,
      items: (receiptData.items || []).map((item) => ({
        name: (item.name || "").trim().toLowerCase(),
        price: item.price ? Math.round(item.price * 100) / 100 : 0,
        quantity: item.quantity || 1,
      })).sort((a, b) => a.name.localeCompare(b.name)), 
    };

    
    const dataString = JSON.stringify(normalized);
    const hash = crypto.createHash("sha256").update(dataString).digest("hex");
    return hash;
  }

  
  compareReceiptData(receiptData1, receiptData2) {
    const fingerprint1 = this.createReceiptFingerprint(receiptData1);
    const fingerprint2 = this.createReceiptFingerprint(receiptData2);

    if (!fingerprint1 || !fingerprint2) {
      return false;
    }

    return fingerprint1 === fingerprint2;
  }

  
  async findDuplicateOcraiResult(userId, receiptData) {
    try {
      const fingerprint = this.createReceiptFingerprint(receiptData);
      
      if (!fingerprint) {
        return null;
      }

      
      const { data: userResults, error } = await supabase
        .from("ocrai_results")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user ocrai results:", error);
        return null;
      }

      if (!userResults || userResults.length === 0) {
        return null;
      }

      
      
      
      for (const result of userResults) {
        
        if (result.ocr_status === "corrected") {
          continue;
        }
        
        if (result.extracted_data) {
          const isDuplicate = this.compareReceiptData(
            receiptData,
            result.extracted_data,
          );

          if (isDuplicate) {
            return result;
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Error finding duplicate ocrai result:", error);
      return null;
    }
  }
}

export const ocrAiService = new OcrAiService();
