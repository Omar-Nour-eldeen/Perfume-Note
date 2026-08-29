import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ar";

type Translations = {
  [key in Language]: {
    [key: string]: string;
  };
};

const translations: Translations = {
  en: {
    // Header
    shop: "Shop",
    collection: "Collection",
    about: "About",
    // Hero
    new_signature: "The New Signature",
    elysium: "Elysium",
    parfum: "Parfum",
    hero_desc: "A modern masterpiece of olfactive luxury, designed for those who leave a lingering memory.",
    scroll: "Scroll to discover",
    // Story
    born_from: "Born from",
    elegance: "Elegance",
    story_desc: "Elysium is more than a fragrance; it is a statement. Crafted by master perfumers in Grasse, it balances the raw intensity of nature with the refined sophistication of modern design. Every drop tells a story of passion, precision, and pure luxury.",
    // Notes
    the: "The",
    notes: "Notes",
    top: "Top",
    top_desc: "Bergamot, Pink Pepper, Saffron",
    heart: "Heart",
    heart_desc: "Damask Rose, Oud, Jasmine",
    base: "Base",
    base_desc: "Vanilla, Amber, Sandalwood",
    // Featured Product CTA
    extrait: "Elysium Extrait",
    size: "100ml / 3.4 oz",
    add_to_cart: "Add to Cart",
    // Collection
    the_collection: "The Collection",
    signature_fragrances: "Signature Fragrances",
    no_products: "No products found.",
    no_products_desc: "Tell us what perfume you'd like to add and we'll create it for you.",
    no_image: "No image",
    // Brand Statement
    quote: '"Perfume is the unseen, unforgettable, ultimate accessory of fashion that heralds your arrival and prolongs your departure."',
    author: "— Elysium Parfum",
    // Newsletter
    join: "Join the Inner Circle",
    subscribe_desc: "Subscribe to receive exclusive access to limited editions, private events, and the world of Elysium.",
    email_placeholder: "Your email address",
    subscribe: "Subscribe"
  },
  ar: {
    // Header
    shop: "تسوق",
    collection: "المجموعة",
    about: "عن العلامة",
    // Hero
    new_signature: "البصمة الجديدة",
    elysium: "إليزيوم",
    parfum: "عطر",
    hero_desc: "تحفة عصرية من الفخامة العطرية، صُممت لأولئك الذين يتركون أثراً لا يُنسى.",
    scroll: "مرر للاستكشاف",
    // Story
    born_from: "وُلِدَ من",
    elegance: "الأناقة",
    story_desc: "إليزيوم ليس مجرد عطر؛ بل هو بيان. صُنع على يد كبار العطارين في غراس، ليوازن بين الكثافة الخام للطبيعة والرقي المتقن للتصميم الحديث. كل قطرة تروي قصة شغف ودقة وفخامة مطلقة.",
    // Notes
    the: "مكونات",
    notes: "العطر",
    top: "القمة",
    top_desc: "البرغموت، الفلفل الوردي، الزعفران",
    heart: "القلب",
    heart_desc: "الورد الدمشقي، العود، الياسمين",
    base: "القاعدة",
    base_desc: "الفانيليا، العنبر، خشب الصندل",
    // Featured Product CTA
    extrait: "إليزيوم إكستريت",
    size: "100 مل / 3.4 أوقية",
    add_to_cart: "أضف إلى السلة",
    // Collection
    the_collection: "المجموعة",
    signature_fragrances: "عطور مميزة",
    no_products: "لم يتم العثور على منتجات.",
    no_products_desc: "أخبرنا بالعطر الذي تود إضافته وسنقوم بتصميمه لك.",
    no_image: "لا توجد صورة",
    // Brand Statement
    quote: '"العطر هو الإكسسوار الأنيق الخفي الذي لا يُنسى، والذي يعلن عن وصولك ويطيل من أثر بقائك."',
    author: "— إليزيوم للعطور",
    // Newsletter
    join: "انضم إلى الدائرة الخاصة",
    subscribe_desc: "اشترك للحصول على وصول حصري للإصدارات المحدودة والفعاليات الخاصة وعالم إليزيوم.",
    email_placeholder: "بريدك الإلكتروني",
    subscribe: "اشتراك"
  }
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("language");
      if (savedLang === "en" || savedLang === "ar") return savedLang;
    }
    return "ar";
  });

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const isRtl = language === "ar";

  useEffect(() => {
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = language;
    if (isRtl) {
      document.documentElement.classList.add("font-arabic");
    } else {
      document.documentElement.classList.remove("font-arabic");
    }
  }, [language, isRtl]);

  return (
    <I18nContext.Provider value={{ language, setLanguage: changeLanguage, t, isRtl }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
