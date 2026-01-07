import { supabase } from "../services/supabase.service.js";
import { getUserLanguage, translateCategory } from "../utils/translations.js";

export const categoriesController = {
  
  getUserCategories: async (req, res, next) => {
    try {
      const user_id = req.user.id;

      
      const userLanguage = await getUserLanguage(user_id, supabase);

      const { data: categories, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true) 
        .or(`is_global.eq.true,user_id.eq.${user_id}`)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch categories",
        });
      }

      
      const translatedCategories = categories.map((category) =>
        translateCategory(category, userLanguage)
      );

      res.status(200).json({
        success: true,
        data: {
          categories: translatedCategories,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  getGlobalCategories: async (req, res, next) => {
    try {
      const user_id = req.user.id;

      
      const userLanguage = await getUserLanguage(user_id, supabase);

      const { data: categories, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_global", true)
        .eq("is_active", true) 
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching global categories:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch global categories",
        });
      }

      
      const translatedCategories = categories.map((category) =>
        translateCategory(category, userLanguage)
      );

      res.status(200).json({
        success: true,
        data: {
          categories: translatedCategories,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  createCategory: async (req, res, next) => {
    try {
      const { name, icon, color } = req.body;
      const user_id = req.user.id;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Category name is required",
        });
      }

      
      const { data: existingCategory, error: checkError } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", user_id)
        .eq("name", name.trim())
        .eq("is_active", true) 
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        
        console.error("Error checking existing category:", checkError);
        return res.status(500).json({
          success: false,
          message: "Failed to check existing categories",
        });
      }

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "You already have a category with this name",
        });
      }

      const { data: category, error } = await supabase
        .from("categories")
        .insert({
          user_id,
          name: name.trim(),
          icon: icon || "FileText",
          color: color || "#6B7280",
          is_global: false,
          is_active: true, 
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating category:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to create category",
        });
      }

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: {
          category,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  updateCategory: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, icon, color } = req.body;
      const user_id = req.user.id;

      
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (icon !== undefined) updateData.icon = icon;
      if (color !== undefined) updateData.color = color;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields to update",
        });
      }

      
      const { data: category, error } = await supabase
        .from("categories")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user_id)
        .eq("is_global", false)
        .select()
        .single();

      if (error || !category) {
        console.error("Error updating category:", error);
        return res.status(404).json({
          success: false,
          message: "Category not found or cannot be updated",
        });
      }

      res.status(200).json({
        success: true,
        message: "Category updated successfully",
        data: {
          category,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  deleteCategory: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      
      const { data: category, error: categoryError } = await supabase
        .from("categories")
        .select("id, is_global, user_id, is_active")
        .eq("id", id)
        .single();

      if (categoryError || !category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      
      if (category.is_global) {
        return res.status(403).json({
          success: false,
          message: "Cannot delete global categories",
        });
      }

      
      if (category.user_id !== user_id) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own categories",
        });
      }

      
      if (!category.is_active) {
        return res.status(400).json({
          success: false,
          message: "Category is already deactivated",
        });
      }

      
      const { data: updatedCategory, error } = await supabase
        .from("categories")
        .update({ is_active: false })
        .eq("id", id)
        .eq("user_id", user_id)
        .eq("is_global", false)
        .select()
        .single();

      if (error || !updatedCategory) {
        console.error("Error deactivating category:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to deactivate category",
        });
      }

      res.status(200).json({
        success: true,
        message: "Category deactivated successfully",
        data: {
          category: updatedCategory,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  restoreCategory: async (req, res, next) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      
      const { data: category, error: categoryError } = await supabase
        .from("categories")
        .select("id, is_global, user_id, is_active")
        .eq("id", id)
        .single();

      if (categoryError || !category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      
      if (category.is_global) {
        return res.status(403).json({
          success: false,
          message:
            "Global categories cannot be restored (they are always active)",
        });
      }

      
      if (category.user_id !== user_id) {
        return res.status(403).json({
          success: false,
          message: "You can only restore your own categories",
        });
      }

      
      if (category.is_active) {
        return res.status(400).json({
          success: false,
          message: "Category is already active",
        });
      }

      
      const { data: restoredCategory, error } = await supabase
        .from("categories")
        .update({ is_active: true })
        .eq("id", id)
        .eq("user_id", user_id)
        .eq("is_global", false)
        .select()
        .single();

      if (error || !restoredCategory) {
        console.error("Error restoring category:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to restore category",
        });
      }

      res.status(200).json({
        success: true,
        message: "Category restored successfully",
        data: {
          category: restoredCategory,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  
  initializeGlobalCategories: async (req, res, next) => {
    try {
      const defaultCategories = [
        
        {
          name: "Salary",
          icon: "Briefcase",
          color: "#10B981",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Freelance",
          icon: "Laptop",
          color: "#059669",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Investment Returns",
          icon: "TrendingUp",
          color: "#047857",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Gifts",
          icon: "Gift",
          color: "#065F46",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Refunds",
          icon: "RotateCcw",
          color: "#064E3B",
          is_global: true,
          user_id: null,
          is_active: true,
        },

        
        {
          name: "Food & Dining",
          icon: "Utensils",
          color: "#EF4444",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Groceries",
          icon: "ShoppingCart",
          color: "#DC2626",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Transportation",
          icon: "Car",
          color: "#B91C1C",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Gas",
          icon: "Fuel",
          color: "#991B1B",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Entertainment",
          icon: "Film",
          color: "#7C2D12",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Shopping",
          icon: "ShoppingBag",
          color: "#F59E0B",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Bills & Utilities",
          icon: "Lightbulb",
          color: "#D97706",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Healthcare",
          icon: "Hospital",
          color: "#B45309",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Education",
          icon: "BookOpen",
          color: "#92400E",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Travel",
          icon: "Plane",
          color: "#78350F",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Housing",
          icon: "Home",
          color: "#8B5CF6",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Insurance",
          icon: "Shield",
          color: "#7C3AED",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Personal Care",
          icon: "Sparkles",
          color: "#6D28D9",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Subscriptions",
          icon: "Smartphone",
          color: "#5B21B6",
          is_global: true,
          user_id: null,
          is_active: true,
        },
        {
          name: "Other",
          icon: "FileText",
          color: "#6B7280",
          is_global: true,
          user_id: null,
          is_active: true,
        },
      ];

      
      const { data: existingCategories, error: checkError } = await supabase
        .from("categories")
        .select("name")
        .eq("is_global", true);

      if (checkError) {
        console.error("Error checking existing categories:", checkError);
        return res.status(500).json({
          success: false,
          message: "Failed to check existing categories",
        });
      }

      const existingNames = existingCategories.map((cat) => cat.name);
      const categoriesToInsert = defaultCategories.filter(
        (cat) => !existingNames.includes(cat.name)
      );

      if (categoriesToInsert.length === 0) {
        return res.status(200).json({
          success: true,
          message: "Global categories already initialized",
          data: {
            existingCount: existingCategories.length,
          },
        });
      }

      const { data: insertedCategories, error: insertError } = await supabase
        .from("categories")
        .insert(categoriesToInsert)
        .select();

      if (insertError) {
        console.error("Error inserting categories:", insertError);
        return res.status(500).json({
          success: false,
          message: "Failed to initialize global categories",
        });
      }

      res.status(201).json({
        success: true,
        message: "Global categories initialized successfully",
        data: {
          insertedCount: insertedCategories.length,
          categories: insertedCategories,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
