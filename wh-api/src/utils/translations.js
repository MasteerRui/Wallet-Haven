

export const TRANSLATIONS = {
  
  ocr: {
    processing: {
      portuguese: "Processando recibo...",
      english: "Processing receipt...",
    },
    success: {
      portuguese: "Recibo processado com sucesso",
      english: "Receipt processed successfully",
    },
    noTransactionsFound: {
      portuguese: "Nenhuma transação encontrada no recibo",
      english: "No transactions found in receipt",
    },
    partialSuccess: {
      portuguese: "Algumas transações foram criadas com sucesso",
      english: "Some transactions were created successfully",
    },
    allCreated: {
      portuguese: "Todas as transações foram criadas com sucesso",
      english: "All transactions created successfully",
    },
    error: {
      portuguese: "Erro ao processar recibo",
      english: "Error processing receipt",
    },
  },

  
  transactionTypes: {
    income: {
      portuguese: "Receita",
      english: "Income",
    },
    expense: {
      portuguese: "Despesa",
      english: "Expense",
    },
    transfer: {
      portuguese: "Transferência",
      english: "Transfer",
    },
    transfer_in: {
      portuguese: "Transferência Recebida",
      english: "Transfer In",
    },
    transfer_out: {
      portuguese: "Transferência Enviada",
      english: "Transfer Out",
    },
  },

  
  categoryNames: {
    
    Salary: {
      portuguese: "Salário",
      english: "Salary",
    },
    Freelance: {
      portuguese: "Freelance",
      english: "Freelance",
    },
    "Investment Returns": {
      portuguese: "Retornos de Investimento",
      english: "Investment Returns",
    },
    Gifts: {
      portuguese: "Presentes",
      english: "Gifts",
    },
    Refunds: {
      portuguese: "Reembolsos",
      english: "Refunds",
    },
    
    "Food & Dining": {
      portuguese: "Alimentação & Restauração",
      english: "Food & Dining",
    },
    Groceries: {
      portuguese: "Supermercado",
      english: "Groceries",
    },
    Transportation: {
      portuguese: "Transportes",
      english: "Transportation",
    },
    Gas: {
      portuguese: "Combustível",
      english: "Gas",
    },
    Entertainment: {
      portuguese: "Entretenimento",
      english: "Entertainment",
    },
    Shopping: {
      portuguese: "Compras",
      english: "Shopping",
    },
    "Bills & Utilities": {
      portuguese: "Contas & Serviços",
      english: "Bills & Utilities",
    },
    Healthcare: {
      portuguese: "Saúde",
      english: "Healthcare",
    },
    Education: {
      portuguese: "Educação",
      english: "Education",
    },
    Travel: {
      portuguese: "Viagens",
      english: "Travel",
    },
    Housing: {
      portuguese: "Habitação",
      english: "Housing",
    },
    Insurance: {
      portuguese: "Seguros",
      english: "Insurance",
    },
    "Personal Care": {
      portuguese: "Cuidados Pessoais",
      english: "Personal Care",
    },
    Subscriptions: {
      portuguese: "Assinaturas",
      english: "Subscriptions",
    },
    Goals: {
      portuguese: "Objetivos",
      english: "Goals",
    },
    Other: {
      portuguese: "Outro",
      english: "Other",
    },
  },

  
  categories: {
    groceries: {
      portuguese: "Supermercado",
      english: "Groceries",
    },
    restaurant: {
      portuguese: "Restaurante",
      english: "Restaurant",
    },
    transport: {
      portuguese: "Transportes",
      english: "Transport",
    },
    entertainment: {
      portuguese: "Entretenimento",
      english: "Entertainment",
    },
    shopping: {
      portuguese: "Compras",
      english: "Shopping",
    },
    utilities: {
      portuguese: "Serviços",
      english: "Utilities",
    },
    healthcare: {
      portuguese: "Saúde",
      english: "Healthcare",
    },
    education: {
      portuguese: "Educação",
      english: "Education",
    },
    other: {
      portuguese: "Outro",
      english: "Other",
    },
  },

  
  currency: {
    converted: {
      portuguese: "Convertido de",
      english: "Converted from",
    },
    rate: {
      portuguese: "Taxa",
      english: "Rate",
    },
    original: {
      portuguese: "Original",
      english: "Original",
    },
  },

  
  errors: {
    invalidFormat: {
      portuguese: "Formato inválido",
      english: "Invalid format",
    },
    notFound: {
      portuguese: "Não encontrado",
      english: "Not found",
    },
    unauthorized: {
      portuguese: "Não autorizado",
      english: "Unauthorized",
    },
    serverError: {
      portuguese: "Erro no servidor",
      english: "Server error",
    },
  },

  
  recurrence: {
    daily: {
      portuguese: "Diário",
      english: "Daily",
    },
    weekly: {
      portuguese: "Semanal",
      english: "Weekly",
    },
    biweekly: {
      portuguese: "Quinzenal",
      english: "Biweekly",
    },
    monthly: {
      portuguese: "Mensal",
      english: "Monthly",
    },
    yearly: {
      portuguese: "Anual",
      english: "Yearly",
    },
  },
};

export const translate = (category, key, language = "english") => {
  try {
    
    const lang = ["portuguese", "english"].includes(language)
      ? language
      : "english";

    
    const translation = TRANSLATIONS[category]?.[key]?.[lang];

    if (translation) {
      return translation;
    }

    
    if (lang === "portuguese") {
      return TRANSLATIONS[category]?.[key]?.["english"] || key;
    }

    return key;
  } catch (error) {
    console.error("Translation error:", error);
    return key;
  }
};

export const translateCategory = (category, language = "english") => {
  if (!category || !category.name) {
    return category;
  }

  try {
    const translatedName = translate("categoryNames", category.name, language);
    return {
      ...category,
      name: translatedName, 
    };
  } catch (error) {
    console.error("Category translation error:", error);
    return category;
  }
};

export const getUserLanguage = async (user_id, supabase) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("preferences_json")
      .eq("id", user_id)
      .single();

    if (error || !user) {
      return "english"; 
    }

    return user.preferences_json?.language || "english";
  } catch (error) {
    console.error("Error fetching user language:", error);
    return "english";
  }
};

export const translateObject = (data, language = "english") => {
  if (!data || typeof data !== "object") {
    return data;
  }

  const translated = { ...data };

  
  if (translated.type) {
    translated.type_translated = translate(
      "transactionTypes",
      translated.type,
      language
    );
  }

  
  if (translated.frequency) {
    translated.frequency_translated = translate(
      "recurrence",
      translated.frequency,
      language
    );
  }

  return translated;
};

export const getCurrencyConversionNote = (
  originalAmount,
  originalCurrency,
  rate,
  language = "english"
) => {
  const originalText = translate("currency", "original", language);
  const rateText = translate("currency", "rate", language);

  return `${originalText}: ${originalAmount} ${originalCurrency} | ${rateText}: ${rate}`;
};

export default {
  translate,
  getUserLanguage,
  translateObject,
  getCurrencyConversionNote,
  TRANSLATIONS,
};
