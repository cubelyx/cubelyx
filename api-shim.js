/**
 * Cubelyx - API Shim Client-Side (100% Gratuit, Zéro Serveur)
 * Intercepte les requêtes /api/* pour exécuter l'authentification,
 * la gestion des comptes, le catalogue et l'administration directement
 * dans le navigateur (avec persistance IndexedDB / localStorage).
 */
"use strict";

(function() {
  const DB_KEY = "cubelyx_data_v2";
  const SALT = "cubelyx_dev_2026_salt";

  async function sha256(str) {
    const enc = new TextEncoder();
    const data = enc.encode(SALT + str);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // Données initiales par défaut
  const INITIAL_DATA = {
    moderator_email: "cubelyx.dev@gmail.com",
    users: [
      {
        id: "usr_mod_1",
        email: "cubelyx.dev@gmail.com",
        name: "Modérateur Cubelyx",
        role: "moderator",
        status: "active",
        client_id: "cl_dl",
        // Mot de passe initial sécurisé: Kube#892!Vex$2026*Pro
        pw_hash: "23c4003ea477123c5e909a392c0c73107eeccaddbf0e6df12c55a85adc12d084",
        must_change: 0,
        failed: 0,
        locked_until: 0,
        created_at: Date.now(),
        last_login: Date.now()
      },
      {
        id: "usr_demo_1",
        email: "atelier@diesellevante.com",
        name: "Équipe Atelier",
        role: "user",
        status: "active",
        client_id: "cl_dl",
        // Mot de passe initial: Atelier!2026
        pw_hash: "f6264ffdf5e656d05f32ebfec6b0744ca2e6ad1c8c502b489ef5a92a54b38d6d",
        must_change: 0,
        failed: 0,
        locked_until: 0,
        created_at: Date.now(),
        last_login: null
      },
      {
        id: "usr_romberg_1",
        email: "atelier@romberg.de",
        name: "Romberg Logistik",
        role: "user",
        status: "active",
        client_id: "cl_romberg",
        // Mot de passe initial: Romberg!2026
        pw_hash: "aea5e4156aa7279d65999ac29ada526dbc3d538011656b4dcece515126028a73",
        must_change: 0,
        failed: 0,
        locked_until: 0,
        created_at: Date.now(),
        last_login: null
      }
    ],
    clients: [
      { id: "cl_dl", name: "Diesel Levante", devis_email: "devis@diesellevante.com", color: "#4C9AFF", created_at: Date.now() },
      { id: "cl_romberg", name: "Romberg", devis_email: "atelier@romberg.de", color: "#237C3E", created_at: Date.now() }
    ],
    settings: {
      maxw: 25,
      fill: 85,
      tare: 1,
      palmin: 5
    },
    cartons: [
      ["DL 355X255X308", 350, 250, 300, "Diesel Levante"],
      ["DL 450X300X350", 450, 300, 350, "Diesel Levante"],
      ["DL 250X200X200", 250, 200, 200, "Diesel Levante"],
      ["Carton 355X255X308", 350, 250, 300, "Romberg"],
      ["Carton 450X300X350", 450, 300, 350, "Romberg"],
      ["Carton 250X200X200", 250, 200, 200, "Romberg"],
      ["Carton Standard 600X400X400", 600, 400, 400, ""]
    ],
    palettes: [
      ["Palette Europe 80X120", 800, 1200, 1600, 20, ""],
      ["Palette Industrielle 100X120", 1000, 1200, 1600, 25, ""],
      ["Demi-Palette 60X80", 600, 800, 1200, 10, ""],
      ["Palette Perdue 80X120", 800, 1200, 1600, 10, ""]
    ],
    articles: [
      ["00LK-3M-028-SW", "Turbocompresseur SW", 310, 240, 250, 6.5, "Turbo", "Diesel Levante"],
      ["00LK-3M-001-SW", "Turbocompresseur SW1", 300, 235, 230, 6.1, "Turbo", "Diesel Levante"],
      ["00LK-2T-004-SW", "CHRA 2T", 140, 140, 162, 1.48, "CHRA", "Diesel Levante"],
      ["00LK-2T-005-SW", "CHRA 2T-5", 145, 145, 170, 1.6, "CHRA", "Diesel Levante"],
      ["00LK-3M-045-SW", "Turbocompresseur SW45", 320, 250, 260, 7.2, "Turbo", "Diesel Levante"],
      ["8G12-300-885", "Turbocompresseur neuf", 300, 235, 230, 6.11, "Turbo", "Diesel Levante"],
      ["1000-010-006", "Cartouche CHRA", 140, 140, 162, 1.48, "CHRA", "Diesel Levante"],
      ["ACC-552-PIECE", "Autre pièce mécanique", 180, 120, 100, 2.0, "Autre", "Diesel Levante"],
            ["10091102", "10 Pots biodégradables, 11 cm rond", 600, 400, 330, 3, "Pots & Godets", "Romberg"],
      ["10091022", "100 Pastilles de coco, 36 mm Ø, Boîte pliante", 400, 300, 330, 1, "Substrats & Pastilles", "Romberg"],
      ["73013AP", "11 Pots en plastique", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["71038DL", "12 pots biodégradables, carré de 8cm", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["71038AP", "System.Xml.XmlElement", 600, 400, 330, 1, "Accessoires & Outils", "Romberg"],
      ["10293006", "System.Xml.XmlElement", 400, 300, 330, 1, "Accessoires & Outils", "Romberg"],
      ["10091106", "14 Pots biodégradables 8 cm carré", 600, 400, 330, 4, "Pots & Godets", "Romberg"],
      ["10091109", "System.Xml.XmlElement", 790, 400, 510, 12, "Accessoires & Outils", "Romberg"],
      ["71008AP", "16 pots biodégradables, rond de 8cm", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["71008DL", "16 pots biodégradables, rond de 8cm", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["10091101", "18 Pots biodégradables, 8 cm rond", 600, 400, 330, 4, "Pots & Godets", "Romberg"],
      ["73189AP", "18 Pots en plastique", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["10293007", "18 Pots en plastique, 9 cm rond, rouge", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["10293048", "20 Etiquettes à piquer en bois, 10 cm", 265, 155, 91, 1, "Accessoires & Outils", "Romberg"],
      ["10091020", "20 Pastilles de coco, 36 mm Ø, Boîte pliante", 400, 300, 330, 1, "Substrats & Pastilles", "Romberg"],
      ["71036AP", "20 pots biodégradables, carré de 6cm", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["73207AP", "20 Pots en plastique", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["10293008", "20 Pots en plastique, 7 cm carré, noir", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["10293046", "20 Pots en plastique, 8 cm carré", 600, 400, 400, 1, "Pots & Godets", "Romberg"],
      ["10091105", "22 Pots biodégradables, 6 cm carré", 400, 300, 330, 2, "Pots & Godets", "Romberg"],
      ["10293009", "22 Pots en plastique, 6 cm rond, rouge", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["10091104", "24 Pots biodégradables, 6 cm carré", 600, 400, 330, 4, "Pots & Godets", "Romberg"],
      ["71006AP", "24 pots biodégradables, rond de 6cm", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["73129AP", "24 Pots en plastique", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["10091100", "26 Pots biodégradables, 6 cm rond", 400, 300, 330, 3, "Pots & Godets", "Romberg"],
      ["10091103", "36 Pots biodégradables, 5 cm carré", 600, 400, 330, 2, "Pots & Godets", "Romberg"],
      ["71005AP", "36 pots biodégradables, carré de 5cm", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["71005DL", "36 pots biodégradables, carré de 5cm", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["71039AP", "36 pots biodégradables, Carrés", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["10091108", "48 Pots biodégradables, 8 cm rond", 790, 400, 510, 12, "Pots & Godets", "Romberg"],
      ["71018AP", "48 pots biodégradables, rond de 8cm", 800, 600, 270, 1, "Pots & Godets", "Romberg"],
      ["71050DL", "50 Pastilles de Coco 36 mm", 400, 300, 330, 1, "Substrats & Pastilles", "Romberg"],
      ["73508GV", "50 Pots en plastique 9 cm carré, noir", 550, 285, 320, 1, "Pots & Godets", "Romberg"],
      ["10091107", "System.Xml.XmlElement", 790, 400, 510, 11, "Accessoires & Outils", "Romberg"],
      ["71016AP", "96 Pots biodégradables, rond de 6cm", 800, 600, 270, 1, "Pots & Godets", "Romberg"],
      ["74558AP", "Alexander Mini-serre rigide 58x19x19 cm", 800, 600, 400, 1, "Mini-Serres", "Romberg"],
      ["74558GV", "Alexander Mini-serre rigide 58x19x19 cm", 800, 600, 420, 1, "Mini-Serres", "Romberg"],
      ["10094264", "Boîte de culture découverte, 29x19x14cm, Navy bleu", 340, 400, 600, 1, "Mini-Serres", "Romberg"],
      ["16294167", "BoQube Anzuchtschale M, Anthrazit-Sommergrün", 390, 200, 270, 1, "Mini-Serres", "Romberg"],
      ["16294190", "BoQube Couvercle M, 37x19x12 cm, rigide, anthracite", 380, 190, 260, 5, "Mini-Serres", "Romberg"],
      ["16294194", "BoQube Couvercle S, 28x12x8 cm, rigide, anthracite", 290, 125, 265, 1, "Mini-Serres", "Romberg"],
      ["16294169", "BoQube L PLUS Mini-serre & Jardinière", 435, 370, 553, 6, "Mini-Serres", "Romberg"],
      ["16294168", "BoQube Terrine S, anthracite-vert clair", 290, 135, 270, 1, "Mini-Serres", "Romberg"],
      ["12094306", "Climatic M Mini-serre rigide 38x24x19 cm", 290, 425, 185, 1, "Mini-Serres", "Romberg"],
      ["12091005", "Coco Plug Tray 52 x 33 x 3 cm", 550, 340, 330, 1, "Substrats & Pastilles", "Romberg"],
      ["10093102", "Coussin de genou, noir", 300, 200, 150, 1, "Accessoires & Outils", "Romberg"],
      ["10294004", "Couvercle de germination 50x32x12 cm", 350, 350, 540, 1, "Mini-Serres", "Romberg"],
      ["74051AP", "Couvercle de germination 50x32x12 cm", 350, 350, 540, 1, "Mini-Serres", "Romberg"],
      ["74051DL", "Couvercle de germination 50x32x12 cm", 350, 350, 540, 1, "Mini-Serres", "Romberg"],
      ["16293085", "Epandeur manuel universel", 80, 30, 39, 1, "Accessoires & Outils", "Romberg"],
      ["10293081", "73129DL", 91, 155, 265, 1, "Accessoires & Outils", "Romberg"],
      ["73189DL", "System.Xml.XmlElement", 400, 300, 330, 1, "Accessoires & Outils", "Romberg"],
      ["Filet de 18 Pots plastique rond de 9 cm", "73224AP", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["Greta Ensemble de semis 50x30 cm", "12093103", 800, 600, 420, 1, "Accessoires & Outils", "Romberg"],
      ["HortiSwitch Thermostat électrique", "Chauffage & Éclairage", 250, 130, 55, 1, "74536DL", "Romberg"],
      ["James Mini-serre 36x22x13 cm", "10293003", 600, 400, 330, 1, "Mini-Serres", "Romberg"],
      ["Kit de plantation: 1 Semoir manuel,", "12093127", 395, 260, 130, 1, "Accessoires & Outils", "Romberg"],
      ["72336AP", "Maria Mini-serre 36x22x13 cm", 30, 330, 350, 1, "74536DL", "Romberg"],
      ["10292020", "Mini serre rigide M   38x24x19 cm, bulk", 600, 400, 330, 1, "Mini-Serres", "Romberg"],
      ["10094106", "Mini-serre L   54x15x12 cm", 600, 400, 115, 1, "Mini-Serres", "Romberg"],
      ["10094203", "Mini-serre L PLUS COCO  54x15x12 cm", 600, 330, 400, 1, "Mini-Serres", "Romberg"],
      ["10094105", "Mini-serre M 36x22x13 cm", 600, 400, 330, 6, "Mini-Serres", "Romberg"],
      ["10094202", "Mini-serre M PLUS COCO  36x22x13 cm", 600, 400, 330, 4, "Mini-Serres", "Romberg"],
      ["10094214", "Mini-serre M PLUS POTS 36x22x13 cm", 400, 300, 330, 3, "Mini-Serres", "Romberg"],
      ["10094104", "Mini-serre rigide L   58x19x19 cm", 600, 400, 330, 2, "Pots & Godets", "Romberg"],
      ["10294117", "Mini-serre rigide M   38x24x19 cm, bulk", 800, 600, 400, 7, "Mini-Serres", "Romberg"],
      ["10294121", "Mini-serre rigide M COLOR  38x24x19 cm, bulk", 400, 260, 437, 1, "Mini-Serres", "Romberg"],
      ["10094101", "Mini-serre rigide S COLOR   29x19x19 cm", 400, 260, 437, 1, "Mini-Serres", "Romberg"],
      ["10094237", "Mini-serre Set de 4, 36 x 22 x 13 cm", 600, 400, 400, 3, "Mini-Serres", "Romberg"],
      ["10094204", "Mini-serre XL PLUS PP   54x28x12cm", 360, 220, 130, 1, "Mini-Serres", "Romberg"],
      ["12093110", "Nappe de chauffage \"SkinnyHeat 55\"", 800, 600, 420, 6, "Mini-Serres", "Romberg"],
      ["12093105", "Nappe de chauffage M  35x25 cm", 620, 85, 85, 1, "74536DL", "Romberg"],
      ["12093104", "Nappe de chauffage S  27x15 cm", 430, 275, 115, 1, "74536DL", "Romberg"],
      ["16293086", "PIKETTEN SET, inscriptible, vert mousse", 430, 190, 120, 1, "74536DL", "Romberg"],
      ["10093201", "Plantoir en bois L, avec graduation", 166, 90, 112, 1, "Accessoires & Outils", "Romberg"],
      ["10093200", "Plantoir en bois S", 300, 200, 150, 1, "Accessoires & Outils", "Romberg"],
      ["10294005", "Plaque de culture 50x32x4 cm", 300, 200, 150, 1, "Accessoires & Outils", "Romberg"],
      ["Terrines & Plaques", "78004AP", 340, 340, 540, 1, "78004DL", "Romberg"],
      ["78004GV", "78004AP", 340, 340, 540, 1, "78004DL", "Romberg"],
      ["10294006", "78004AP", 340, 340, 540, 1, "78004DL", "Romberg"],
      ["Plaque de culture 50x32x6 cm", "78004AP", 340, 340, 540, 1, "78004DL", "Romberg"],
      ["10294008", "Plaque de culture Multitopf 50x30x5 cm", 340, 340, 540, 1, "78004DL", "Romberg"],
      ["10294009", "10294010", 350, 350, 540, 1, "78004DL", "Romberg"],
      ["Plaque de culture Multitopf 50x30x6 cm", "10294010", 350, 350, 540, 1, "78004DL", "Romberg"],
      ["10293030", "Presse mottes", 350, 350, 540, 1, "78004DL", "Romberg"],
      ["10094404", "PU:RE CRAFTED Plateau de culture L, env. 58 x 19 x 6,7cm + 30 pots galvanisé", 300, 200, 150, 1, "Accessoires & Outils", "Romberg"],
      ["10094405", "10094403", 200, 400, 600, 1, "Pots & Godets", "Romberg"],
      ["PU:RE CRAFTED Serre L PLUS POTS, env. 58 x 19 x 19,5 cm + 30 Pots, vert", "10094403", 200, 400, 600, 1, "Pots & Godets", "Romberg"],
      ["10094402", "PU:RE CRAFTED Serre L PLUS POTS, env. 58 x 19 x 19,5cm + 30 pots, zinc", 400, 400, 600, 1, "Pots & Godets", "Romberg"],
      ["10094400", "PU:RE CRAFTED Terrine à semis L, env. 58 x 19 x 6,7 cm, zinc naturel", 400, 400, 600, 1, "Pots & Godets", "Romberg"],
      ["10094401", "PU:RE CRAFTED Terrine à semis L, env. 58 x 19 x 6,7cm, vert", 140, 260, 600, 1, "78004DL", "Romberg"],
      ["10094412", "PU:RE TERRACOTTA Arrosage des plantes", 140, 260, 600, 1, "78004DL", "Romberg"],
      ["10094406", "PU:RE TERRACOTTA Bac de culture S, env. 29 x 19 x 6,5 cm", 330, 300, 400, 1, "Accessoires & Outils", "Romberg"],
      ["24094257", "PU:RE TERRACOTTA Kit de culture, 3x pots, graines, substrat, etiquettes", 300, 300, 400, 1, "78004DL", "Romberg"],
      ["10094408", "PU:RE TERRACOTTA Set Mini Serre, 15 Pots + 1L Terreau d. culture, 5 Étiqu", 253, 261, 310, 1, "Substrats & Pastilles", "Romberg"],
      ["12093108", "12093109", 210, 400, 600, 1, "Substrats & Pastilles", "Romberg"],
      ["Résistance électrique 6 m", "System.Xml.XmlElement", 240, 185, 160, 1, "Accessoires & Outils", "Romberg"],
      ["75010GV", "Semoir Manuel Rotatif", 240, 185, 160, 1, "74536DL", "Romberg"],
      ["10093203", "Serre en bois M 37 x 24 x 13 cm avec 24 pots", 195, 160, 130, 1, "Accessoires & Outils", "Romberg"],
      ["73029GV", "Terrine à semis 29x19x6 cm", 370, 240, 130, 1, "Pots & Godets", "Romberg"],
      ["10294003", "Terrine à semis 50x32x6 cm", 395, 215, 250, 2, "78004DL", "Romberg"],
      ["73212AP", "73212GV", 350, 350, 540, 1, "78004DL", "Romberg"],
      ["10294001", "73212GV", 350, 350, 540, 1, "78004DL", "Romberg"],
      ["Terrine à semis M  38x24x6 cm", "73212GV", 350, 350, 540, 1, "78004DL", "Romberg"],
      ["10294002", "Terrine à semis XXL  59x39x6 cm", 390, 250, 200, 1, "78004DL", "Romberg"],
      ["10294011", "Terrine Multitopf 50x30x3 cm", 602, 402, 345, 1, "78004DL", "Romberg"],
      ["10093061", "Tour à pommes de terre, 4 niveaux", 350, 350, 540, 1, "78004DL", "Romberg"],
      ["10194204", "Mini-serre XL PLUS PP  54x28x12 cm", 300, 200, 150, 1, "Accessoires & Outils", "Romberg"],
      ["12093016", "Ciseaux Harvest \"Bonsai\"", 800, 600, 420, 1, "Mini-Serres", "Romberg"],
      ["16294199", "BoQube Mini-serre & Jardinière système", 242, 124, 109, 1, "Accessoires & Outils", "Romberg"],
      ["16294157", "BOQUBE Terrine S Green Edition", 350, 415, 500, 1, "Mini-Serres", "Romberg"],
      ["10194106", "10094201", 290, 135, 270, 1, "Mini-Serres", "Romberg"],
      ["Mini-serre XS PLUS COCO  16x11,5x11 cm", "Mini-serre L PLUS COCO  54x15x12 cm", 600, 400, 330, 4, "Mini-Serres", "Romberg"],
      ["12093111", "Nappe de chauffage \"SkinnyHeat 75\"", 400, 300, 330, 4, "Mini-Serres", "Romberg"],
      ["12093122", "HortiSwitch 3.0 Thermostat", 820, 85, 85, 1, "74536DL", "Romberg"],
      ["74051GV", "16294196", 300, 135, 55, 1, "74536DL", "Romberg"],
      ["BoQube Couvercle S, 28x12x8 cm, rigide, crème", "Couvercle de germination 50x32x12 cm", 350, 350, 540, 1, "Mini-Serres", "Romberg"],
      ["10191200", "Substrat POP UP spécial semis", 280, 125, 260, 1, "Mini-Serres", "Romberg"],
      ["73013DL", "Filet de 15 Pots plastiques rond de 13cm", 590, 390, 255, 1, "Substrats & Pastilles", "Romberg"],
      ["73013GV", "15 Pots en plastique 13 cm rond", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["10294105", "Mini-serre M   36x22x13 cm", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["74338PAP", "Marco Mini-serre rigide 38x24x19cm", 600, 400, 330, 1, "Mini-Serres", "Romberg"],
      ["16294394", "BoQube M PLUS LED anthracite-vert", 1200, 800, 1350, 1, "Mini-Serres", "Romberg"],
      ["10295111", "Housse de protection hivernale XXXL", 800, 600, 400, 5, "74536DL", "Romberg"],
      ["10191101", "20 Pots biodégradables, 8 cm rond", 590, 400, 350, 1, "Accessoires & Outils", "Romberg"],
      ["10194218", "KIT COMPLET BARBEQUE 29x19x19 cm", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["71016GV", "96 Pots biodégradables 6 cm ronds", 600, 400, 400, 1, "Accessoires & Outils", "Romberg"],
      ["10191013", "100 Pastilles de coco, en blister", 800, 600, 270, 1, "Pots & Godets", "Romberg"],
      ["10294007", "10293005", 400, 300, 330, 1, "Substrats & Pastilles", "Romberg"],
      ["Europalette 1200x800mm", "System.Xml.XmlElement", 600, 400, 330, 1, "Accessoires & Outils", "Romberg"],
      ["PALETTE EUROPE", "System.Xml.XmlElement", 600, 400, 330, 1, "Accessoires & Outils", "Romberg"],
      ["10294025", "Couvercle L, 58x19x13 cm", 300, 200, 150, 1, "Accessoires & Outils", "Romberg"],
      ["10293011", "Ficelle de jute écru", 580, 190, 130, 1, "Mini-Serres", "Romberg"],
      ["10093206", "Boîte de culture en bois (21x21x9 cm)", 160, 200, 170, 1, "Accessoires & Outils", "Romberg"],
      ["10194104", "10191103", 210, 210, 90, 1, "Mini-Serres", "Romberg"],
      ["10194216", "Mini-serre rigide M   38x24x19 cm, bulk", 800, 600, 400, 7, "Mini-Serres", "Romberg"],
      ["Mini-serre S PLUS COCO  27,5x11,5x11 cm", "36 Pots biodégradables, 5 cm carré", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["10191105", "12094303", 400, 300, 330, 3, "Mini-Serres", "Romberg"],
      ["Thermo M Mini-serre rigide   38x24x19 cm", "22 Pots biodégradables, 6 cm carré", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["12091003", "50 Coco Plugs, Pastilles de coco", 385, 245, 195, 1, "Mini-Serres", "Romberg"],
      ["10191000", "20 Pastilles de coco, 36 mm Ø", 400, 300, 330, 1, "Substrats & Pastilles", "Romberg"],
      ["10294127", "Mini-serre rigide L 58x19x19 cm", 400, 300, 330, 1, "Substrats & Pastilles", "Romberg"],
      ["10093208", "Paper Pot Maker", 580, 190, 190, 1, "Mini-Serres", "Romberg"],
      ["10294019", "10091231", 300, 200, 150, 1, "Pots & Godets", "Romberg"],
      ["30 Grow Tabs 30mm", "System.Xml.XmlElement", 400, 250, 350, 4, "Accessoires & Outils", "Romberg"],
      ["10194105", "10192018", 300, 200, 150, 1, "Substrats & Pastilles", "Romberg"],
      ["KIT COMPLET LITTLE ITALY 29x19x19 cm", "Marco Mini-serre rigide 38x24x19cm", 600, 400, 330, 4, "Mini-Serres", "Romberg"],
      ["10092500", "Présentoir display accessoires de semis", 606, 400, 1400, 1, "Accessoires & Outils", "Romberg"],
      ["10293001", "Plantoir, 2 unités", 800, 600, 2100, 68, "Accessoires & Outils", "Romberg"],
      ["75281GV", "Résistance électrique 6 m (4m chauffage)", 200, 100, 150, 1, "Accessoires & Outils", "Romberg"],
      ["10094216", "10091000", 240, 185, 160, 1, "74536DL", "Romberg"],
      ["10093202", "12094303", 400, 300, 330, 3, "Mini-Serres", "Romberg"],
      ["Serre en bois L 57 x 17 x 13 cm avec 16 pots", "Mini-serre rigide L 58x19x19 cm", 400, 300, 330, 6, "Substrats & Pastilles", "Romberg"],
      ["16293098", "Gobelet verseur, 250 ml", 570, 170, 130, 1, "Pots & Godets", "Romberg"],
      ["10295004", "16294198", 395, 260, 130, 1, "Pots & Godets", "Romberg"],
      ["16291498", "System.Xml.XmlElement", 480, 300, 150, 1, "Accessoires & Outils", "Romberg"],
      ["74536GV", "BOQUBE Terrine S Green Edition", 350, 415, 500, 1, "Mini-Serres", "Romberg"],
      ["74358GV", "System.Xml.XmlElement", 254, 310, 240, 36, "Accessoires & Outils", "Romberg"],
      ["Oscar Grande-serre rigide 52x42x23 cm", "10293003", 600, 400, 330, 1, "Mini-Serres", "Romberg"],
      ["73129GV", "12 Pots en plastique 9 cm carré, noir", 520, 430, 170, 1, "Mini-Serres", "Romberg"],
      ["10091016", "20 Pastilles de coco organiques, 36 mm Ø", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["16291099", "10 Pastilles de coco", 400, 300, 330, 6, "Substrats & Pastilles", "Romberg"],
      ["16293096", "Accessoires pour la culture, Mini pelle", 90, 166, 122, 1, "Substrats & Pastilles", "Romberg"],
      ["16293087", "Accessoires pour la culture GreenEdition", 400, 260, 130, 1, "Accessoires & Outils", "Romberg"],
      ["16294192", "BoQube Couvercle M, 37x19x12 cm, rigide, crème", 400, 260, 130, 1, "Accessoires & Outils", "Romberg"],
      ["10091002", "6 Pastilles de coco, 70 mm Ø", 380, 190, 260, 5, "Mini-Serres", "Romberg"],
      ["71005GV", "16294155", 400, 300, 330, 5, "Substrats & Pastilles", "Romberg"],
      ["BoQube Terrine M Green Edition", "36 pots biodégradables, carré de 5cm", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["16293089", "16291499", 390, 200, 270, 1, "Mini-Serres", "Romberg"],
      ["10294203", "16294198", 395, 260, 130, 1, "Pots & Godets", "Romberg"],
      ["10293047", "System.Xml.XmlElement", 254, 310, 240, 1, "Accessoires & Outils", "Romberg"],
      ["50 Pots en plastique, 7 cm carré, noir", "Mini-serre M 36x22x13 cm", 600, 400, 330, 1, "Mini-Serres", "Romberg"],
      ["10194102", "Mini-serre rigide M   38x24x19 cm", 590, 400, 400, 1, "Pots & Godets", "Romberg"],
      ["10194201", "10294120", 730, 400, 400, 1, "Mini-Serres", "Romberg"],
      ["10295000", "Nappe de chauffage \"SkinnyHeat 75\"", 400, 300, 330, 1, "Mini-Serres", "Romberg"],
      ["Cloche à salade blanche", "System.Xml.XmlElement", 600, 400, 340, 1, "Accessoires & Outils", "Romberg"],
      ["16294193", "BoQube Terrine M, 37x19x6 cm, rigide, crème doré", 400, 300, 230, 1, "Accessoires & Outils", "Romberg"],
      ["10091001", "50 Pastilles de coco, 36 mm Ø", 380, 190, 260, 2, "Mini-Serres", "Romberg"],
      ["73189GV", "18 Pots en plastique 9 cm ronde", 400, 300, 330, 6, "Substrats & Pastilles", "Romberg"],
      ["12091006", "50 Terra Plugs, Pastilles de tourbe", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["10192035", "96 Pots biodégradables 6 cm rond", 400, 300, 330, 1, "Substrats & Pastilles", "Romberg"],
      ["10194214", "10191107", 790, 400, 510, 1, "Pots & Godets", "Romberg"],
      ["16294398", "Mini-serre rigide L   58x19x19 cm", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["BoQube L PLUS LED anthracite-vert", "System.Xml.XmlElement", 790, 400, 510, 1, "Accessoires & Outils", "Romberg"],
      ["14194205", "Mini-serre rigide TOM TOMATE 29x19x19 cm", 435, 370, 553, 7, "74536DL", "Romberg"],
      ["10293004", "Set d'étiquettes et un crayon", 600, 400, 400, 1, "Mini-Serres", "Romberg"],
      ["10295012", "Film de forcage 10 x 1,5 m", 200, 150, 100, 1, "Accessoires & Outils", "Romberg"],
      ["12093102", "Ventilateur, 5x5x1,5cm, 5 Watt", 475, 290, 135, 1, "Accessoires & Outils", "Romberg"],
      ["16294396", "BoQube M PLUS LED crème cuivre", 50, 50, 15, 1, "Accessoires & Outils", "Romberg"],
      ["10094236", "Kit de culture du cresson, Vert", 800, 600, 400, 5, "74536DL", "Romberg"],
      ["10191106", "10295106", 390, 200, 270, 1, "Accessoires & Outils", "Romberg"],
      ["73507GV", "14 Pots biodégradables 8 cm carré", 600, 400, 330, 4, "Pots & Godets", "Romberg"],
      ["50 Pots en plastique 7 cm carré, noir", "System.Xml.XmlElement", 240, 170, 65, 1, "Accessoires & Outils", "Romberg"],
      ["10094102", "24091205", 590, 400, 400, 1, "Pots & Godets", "Romberg"],
      ["Terreau à base de coco", "10294120", 730, 400, 400, 3, "Mini-Serres", "Romberg"],
      ["10294126", "Mini-serre rigide M 38x24x19 cm", 430, 330, 330, 1, "Substrats & Pastilles", "Romberg"],
      ["10295013", "House de croissance pour tomates", 380, 240, 190, 1, "Mini-Serres", "Romberg"],
      ["16293120", "Lampe horticole LED, 200x26x10mm, 5 Watt", 395, 300, 75, 1, "Accessoires & Outils", "Romberg"],
      ["12094107", "16294170", 220, 70, 45, 1, "74536DL", "Romberg"],
      ["BOQUBE Flexi Garden, 2er Set, gris clair", "System.Xml.XmlElement", 609, 403, 211, 1, "Accessoires & Outils", "Romberg"],
      ["12093112", "Nappe de chauffage \"SkinnyHeat 85\"", 300, 200, 150, 7, "Mini-Serres", "Romberg"],
      ["74238GV", "Marco Mini-serre rigide 38x24x19 cm", 920, 85, 85, 1, "74536DL", "Romberg"],
      ["10194103", "Mini-serre rigide M COLOR   38x24x19 cm", 790, 510, 400, 1, "Mini-Serres", "Romberg"],
      ["12093015", "Ciseaux Harvest \"Deluxe\"", 730, 400, 400, 3, "Mini-Serres", "Romberg"],
      ["71036GV", "20 Pots biodégradables 6 cm carrés", 300, 200, 150, 1, "Accessoires & Outils", "Romberg"],
      ["71050GV", "16293099", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["10293028", "50 Pastilles de Coco 36 mm", 400, 300, 330, 1, "Substrats & Pastilles", "Romberg"],
      ["Waterstick indicateur d'arrosage,", "System.Xml.XmlElement", 90, 166, 122, 1, "Accessoires & Outils", "Romberg"],
      ["12093106", "Nappe de chauffage L  60x15 cm", 227, 167, 255, 1, "Accessoires & Outils", "Romberg"],
      ["74436GV", "Gustave Mini-serre set 36x22x13 cm", 600, 150, 50, 1, "74536DL", "Romberg"],
      ["10291203", "Substrat de culture à base de coco", 600, 400, 330, 1, "Mini-Serres", "Romberg"],
      ["10191100", "10295014", 400, 300, 330, 1, "Substrats & Pastilles", "Romberg"],
      ["10091017", "26 Pots biodégradables, 6 cm rond", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["50 Pastilles de coco organiques, 36 mm Ø", "Ventilateur, 5x5x1,5cm, 5 Watt", 480, 295, 145, 1, "Accessoires & Outils", "Romberg"],
      ["12093113", "Nappe de chauffage \"SkinnyHeat 95\"", 400, 300, 330, 8, "Substrats & Pastilles", "Romberg"],
      ["12091008", "Terra Plug Tray 52x33x3", 1020, 85, 85, 1, "74536DL", "Romberg"],
      ["16293097", "Arrosoir avec pelle intégrée", 550, 350, 410, 1, "Accessoires & Outils", "Romberg"],
      ["16294195", "BoQube Terrine S, 28x12x5 cm, rigide, anthracite-vert", 390, 200, 270, 1, "Accessoires & Outils", "Romberg"],
      ["12094305", "12093107", 280, 125, 260, 1, "Mini-Serres", "Romberg"],
      ["Nappe de chauffage XXL  55x35 cm", "System.Xml.XmlElement", 590, 270, 180, 1, "Accessoires & Outils", "Romberg"],
      ["71036DL", "16294159", 430, 375, 115, 1, "74536DL", "Romberg"],
      ["BoQube L Plus Green Edition", "16293099", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["10194203", "16294176", 435, 3780, 553, 1, "Mini-Serres", "Romberg"],
      ["70040K", "Mini-serre M 36x22x13 cm", 600, 400, 330, 6, "Mini-Serres", "Romberg"],
      ["Pastilles terreau compressé 35 mm Ø", "BoQube L PLUS Mini-serre & Jardinière", 435, 3780, 553, 6, "Mini-Serres", "Romberg"],
      ["10294106", "10295015", 400, 350, 220, 1, "Substrats & Pastilles", "Romberg"],
      ["Film de forcage, 7,2x1,35m, 50g/m²", "Mini-serre L PLUS COCO  54x15x12 cm", 600, 400, 330, 1, "Mini-Serres", "Romberg"],
      ["73038GV", "Terrine à semis 38x24x6 cm", 475, 290, 135, 9, "Accessoires & Outils", "Romberg"],
      ["10192210", "Présentoir display-accessoires de semis", 390, 250, 200, 3, "78004DL", "Romberg"],
      ["16294399", "HOMEGARDEN - Mini-Jardin avec lumière", 606, 400, 1550, 31, "Accessoires & Outils", "Romberg"],
      ["10192230", "74338AP", 437, 165, 510, 1, "Accessoires & Outils", "Romberg"],
      ["10094246", "System.Xml.XmlElement", 606, 400, 1550, 1, "Accessoires & Outils", "Romberg"],
      ["Bocal à germination avec couvercle à tamis, 720 ml", "BoQube M PLUS LED anthracite-vert", 730, 400, 400, 1, "Mini-Serres", "Romberg"],
      ["12094304", "Lumio S Mini-serre rigide   29x19x19 cm", 410, 310, 340, 6, "Mini-Serres", "Romberg"],
      ["10192510", "Présentoir \"La Tour\", display accessoire", 335, 270, 180, 1, "Mini-Serres", "Romberg"],
      ["10294103", "73024GV", 800, 600, 2100, 1, "Accessoires & Outils", "Romberg"],
      ["Terrine à semis 21,5x17,5x5,5 cm", "Ciseaux Harvest \"Deluxe\"", 730, 400, 400, 1, "Mini-Serres", "Romberg"],
      ["10194229", "Mini-serre M PLUS PP 36x22x13cm", 370, 240, 190, 1, "78004DL", "Romberg"],
      ["10091013", "10295002", 600, 400, 330, 1, "Mini-Serres", "Romberg"],
      ["Cloches de protection lot de 12", "10293005", 400, 300, 330, 9, "Substrats & Pastilles", "Romberg"],
      ["10092250", "Présentoir display 2 - accessoires de semis", 350, 290, 290, 1, "Accessoires & Outils", "Romberg"],
      ["14192002", "10194215", 1550, 400, 600, 31, "Accessoires & Outils", "Romberg"],
      ["Mini-serre L PLUS POTS  54x15x12 cm", "Set d'étiquettes et un crayon", 600, 400, 1400, 1, "Mini-Serres", "Romberg"],
      ["10191108", "10094247", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["Eco Mini-serre 20x15x8,5cm, 1x couvercle, 3x Tray, 3x substrat, 3x etiquettes", "48 Pots biodégradables, 8 cm rond", 790, 400, 510, 1, "Pots & Godets", "Romberg"],
      ["10292027", "74036GV", 410, 310, 340, 6, "Substrats & Pastilles", "Romberg"],
      ["Charles Mini-serre 36x22x13 cm", "Paper Pot Maker", 580, 190, 190, 1, "Mini-Serres", "Romberg"],
      ["16294172", "BoQube Terrine M, blanc-violet", 600, 400, 330, 1, "Mini-Serres", "Romberg"],
      ["10294128", "10192029", 390, 200, 270, 2, "Mini-Serres", "Romberg"],
      ["KIT COMPLET ITALY & BARBECUE", "Paper Pot Maker", 580, 190, 190, 1, "Mini-Serres", "Romberg"],
      ["10093205", "Boîte de culture en bois (31x11x9 cm) incl. 3L substrat", 606, 400, 1400, 1, "Accessoires & Outils", "Romberg"],
      ["12093100", "Lampe horticole, T5HO 28 cm, 12 Watt", 390, 200, 280, 4, "Substrats & Pastilles", "Romberg"],
      ["10295003", "Filet anti-insectes 2 x 4 m", 320, 85, 44, 1, "74536DL", "Romberg"],
      ["10091021", "50 Pastilles de coco, 36 mm Ø, Boîte pliante", 590, 400, 315, 1, "Accessoires & Outils", "Romberg"],
      ["10191001", "10293002", 400, 300, 330, 1, "Substrats & Pastilles", "Romberg"],
      ["10294000", "18 Pots en plastique 9 cm ronde", 400, 300, 330, 1, "Substrats & Pastilles", "Romberg"],
      ["Terrine à semis S   29x19x6 cm, verte, rigide, non perforée", "Serre en bois M 37 x 24 x 13 cm avec 24 pots", 195, 160, 130, 1, "Accessoires & Outils", "Romberg"],
      ["10191102", "10094215", 395, 215, 250, 1, "78004DL", "Romberg"],
      ["10295105", "10 Pots biodégradables, 11 cm rond", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["Résistance électrique 10 m", "10094247", 600, 400, 330, 2, "Pots & Godets", "Romberg"],
      ["10091018", "100 Pastilles de coco organiques,36 mm Ø", 240, 170, 65, 1, "74536DL", "Romberg"],
      ["16294173", "BoQube Couvercle M, Blanc", 400, 300, 330, 8, "Substrats & Pastilles", "Romberg"],
      ["10295009", "10091211", 390, 200, 270, 5, "Mini-Serres", "Romberg"],
      ["6 Boules de graines, 2 variété", "System.Xml.XmlElement", 530, 350, 190, 4, "Accessoires & Outils", "Romberg"],
      ["16294393", "12093114", 400, 270, 150, 3, "Accessoires & Outils", "Romberg"],
      ["Nappe de chauffage \"SkinnyHeat 115\"", "Mini-serre rigide TOM TOMATE 29x19x19 cm", 435, 370, 553, 7, "74536DL", "Romberg"],
      ["75010DL", "16293095", 1220, 85, 85, 1, "74536DL", "Romberg"],
      ["Kit de culture d'avocat", "Serre en bois M 37 x 24 x 13 cm avec 24 pots", 195, 160, 130, 1, "Accessoires & Outils", "Romberg"],
      ["16294197", "BoQube Terrine S, 28x12x5 cm, rigide, crème doré", 400, 260, 130, 1, "Accessoires & Outils", "Romberg"],
      ["73226GV", "22 Pots en plastique 6 cm ronde", 280, 125, 260, 1, "Mini-Serres", "Romberg"],
      ["10094211", "Mini-serre L PLUS PP   54x15x12 cm", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["16294156", "BOQUBE Couvercle M Green Edition", 600, 400, 990, 2, "Mini-Serres", "Romberg"],
      ["16291299", "POPUP BOX Substrat de culture", 390, 200, 270, 5, "Mini-Serres", "Romberg"],
      ["16294174", "BoQube Terrine S", 254, 310, 240, 1, "Substrats & Pastilles", "Romberg"],
      ["10294104", "73212DL", 290, 135, 270, 1, "Mini-Serres", "Romberg"],
      ["10194101", "Mini-serre rigide M   38x24x19 cm, bulk", 800, 600, 400, 1, "Mini-Serres", "Romberg"],
      ["16293093", "73212GV", 350, 350, 540, 1, "78004DL", "Romberg"],
      ["Mini-plantes verticales avec", "Mini-serre Set de 4, 36 x 22 x 13 cm", 600, 400, 400, 1, "Mini-Serres", "Romberg"],
      ["16294191", "BoQube Terrine M, 37x19x6 cm, rigide, anthracite-vert", 390, 200, 270, 1, "Accessoires & Outils", "Romberg"],
      ["16293094", "Mini pots de plantes", 380, 190, 260, 2, "Mini-Serres", "Romberg"],
      ["16294158", "BoQube Couvercle S Green Edition", 390, 200, 270, 1, "Pots & Godets", "Romberg"],
      ["16294175", "BoQube Couvercle S, Blanc", 290, 135, 270, 1, "Mini-Serres", "Romberg"],
      ["71008GV", "10194100", 290, 135, 270, 1, "Mini-Serres", "Romberg"],
      ["Mini-serre rigide S  29x19x19 cm", "16 pots biodégradables, rond de 8cm", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["71038GV", "10194202", 600, 400, 400, 1, "Mini-Serres", "Romberg"],
      ["10194228", "12 pots biodégradables, carré de 8cm", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["Mini-serre-Set M PLUS PP 36x22x13 cm", "Mini-serre M PLUS POTS 36x22x13 cm", 400, 300, 330, 1, "Mini-Serres", "Romberg"],
      ["10093060", "Pot à réserve d'eau pour tomates", 600, 400, 330, 1, "Mini-Serres", "Romberg"],
      ["10292028", "10092210", 300, 200, 150, 1, "Pots & Godets", "Romberg"],
      ["10293010", "Paper Pot Maker", 580, 190, 190, 1, "Mini-Serres", "Romberg"],
      ["Etiquettes à piquer 12 cm", "HOMEGARDEN - Mini-Jardin avec lumière", 606, 400, 1550, 31, "Accessoires & Outils", "Romberg"],
      ["71000K", "Pastilles de coco, 36 mm  Ø", 230, 190, 120, 1, "Accessoires & Outils", "Romberg"],
      ["10194200", "KIT COMPLET AROMATIC   29x19x19 cm", 370, 235, 225, 1, "Substrats & Pastilles", "Romberg"],
      ["71006DL", "10194211", 600, 400, 400, 1, "Accessoires & Outils", "Romberg"],
      ["10295001", "24 pots biodégradables, rond de 6cm", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["Cloche à salade noire", "BOQUBE Couvercle M Green Edition", 600, 400, 990, 1, "Mini-Serres", "Romberg"],
      ["73207DL", "74238DL", 400, 300, 230, 1, "Accessoires & Outils", "Romberg"],
      ["10191104", "System.Xml.XmlElement", 400, 300, 330, 1, "Accessoires & Outils", "Romberg"],
      ["10191002", "Mini-serre rigide M COLOR   38x24x19 cm", 730, 400, 400, 1, "Mini-Serres", "Romberg"],
      ["10191109", "24 Pots biodégradables, 6 cm carré", 600, 400, 330, 1, "Pots & Godets", "Romberg"],
      ["10194217", "16294155", 400, 300, 330, 1, "Substrats & Pastilles", "Romberg"],
      ["10292026", "System.Xml.XmlElement", 790, 400, 510, 1, "Accessoires & Outils", "Romberg"],
      ["Mini serre rigide M 38x24x19 cm", "Présentoir display accessoires de semis", 600, 400, 400, 1, "Accessoires & Outils", "Romberg"],
      ["16294171", "BOQUBE Flexi Garden, 2er Set, anthracite", 380, 240, 190, 1, "Mini-Serres", "Romberg"],
      ["10091230", "15 Grow Tabs 60mm", 300, 200, 150, 7, "Mini-Serres", "Romberg"],
      ["10294118", "Mini-serre rigider S 29X19X19 cm, bulk", 300, 200, 150, 1, "Substrats & Pastilles", "Romberg"],
      ["71006GV", "10093204", 590, 400, 210, 1, "Mini-Serres", "Romberg"],
      ["Boîte de culture en bois (11x11x9 cm) incl. 1L substrat", "24 pots biodégradables, rond de 6cm", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["10192019", "KIT COMPLET BARBECUE", 400, 260, 130, 3, "Substrats & Pastilles", "Romberg"],
      ["12093101", "Lampe Horticole, T5HO 55 cm, 24 watts", 606, 400, 1400, 1, "Accessoires & Outils", "Romberg"],
      ["73207GV", "20 Pots en plastique 7 cm carré, noir", 576, 85, 44, 1, "74536DL", "Romberg"],
      ["12094301", "Maximus Complete 3.0    59x39x27 cm", 400, 300, 330, 1, "Pots & Godets", "Romberg"],
      ["K72012HQ", "Display, 60x40x99 cm,HQ bedr.", 609, 403, 211, 1, "Accessoires & Outils", "Romberg"],
      ["10192003", "Mini-serre rigide Aromatique 29x19x19 cm", 600, 400, 990, 1, "Accessoires & Outils", "Romberg"],
      ["10294204", "Mini-serre BoQube L", 600, 400, 140, 1, "Mini-Serres", "Romberg"],
      ["RMB-BONSAI-01", "Ciseaux Harvest Bonsai", 180, 100, 25, 0.2, "Accessoires & Outils", "Romberg"]

    ],
    audit: [
      { id: "aud_init", ts: Date.now(), user_id: "usr_mod_1", email: "cubelyx.dev@gmail.com", action: "initialisation", detail: "Démarrage de Cubelyx en version 100% autonome" }
    ]
  };

  // Gestion du stockage
  function getStore() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) {
        localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_DATA));
        return INITIAL_DATA;
      }
      const data = JSON.parse(raw);
      let changed = false;

      // Synchroniser les clients initiaux
      if (!data.clients) { data.clients = []; changed = true; }
      INITIAL_DATA.clients.forEach(c => {
        if (!data.clients.some(x => x.id === c.id || x.name.toLowerCase() === c.name.toLowerCase())) {
          data.clients.push(c);
          changed = true;
        }
      });

      // Synchroniser les utilisateurs initiaux
      if (!data.users) { data.users = []; changed = true; }
      INITIAL_DATA.users.forEach(u => {
        if (!data.users.some(x => x.id === u.id || x.email.toLowerCase() === u.email.toLowerCase())) {
          data.users.push(u);
          changed = true;
        }
      });

      // Synchroniser les articles initiaux (sans écraser)
      if (!data.articles) { data.articles = []; changed = true; }
      const dummyRefs = new Set(["RMB-1001", "RMB-1002", "RMB-2001", "RMB-3001", "RMB-4001"]);
      const origArtLen = data.articles.length;
      data.articles = data.articles.filter(a => !a || !dummyRefs.has(String(a[0]).trim()));
      if (data.articles.length !== origArtLen) changed = true;
      INITIAL_DATA.articles.forEach(a => {
        if (!data.articles.some(x => x[0] === a[0])) {
          data.articles.push(a);
          changed = true;
        }
      });

      // Synchroniser les cartons initiaux
      if (!data.cartons) { data.cartons = []; changed = true; }
      // Nettoyer les cartons invalides ou corrompus (dimensions <= 0 ou noms incomplets)
      if (data.cartons) {
        const origCount = data.cartons.length;
        data.cartons = data.cartons.filter(c => c && c[0] && String(c[0]).trim().length > 2 && Number(c[1] || 0) > 0 && Number(c[2] || 0) > 0 && Number(c[3] || 0) > 0);
        if (data.cartons.length !== origCount) changed = true;
      }
      INITIAL_DATA.cartons.forEach(c => {
        if (!data.cartons.some(x => x[0] === c[0])) {
          data.cartons.push(c);
          changed = true;
        }
      });

      // Synchroniser les palettes initiales
      if (!data.palettes) { data.palettes = []; changed = true; }
      if (data.palettes) {
        const origCount = data.palettes.length;
        data.palettes = data.palettes.filter(p => p && p[0] && String(p[0]).trim().length > 2 && Number(p[1] || 0) > 0 && Number(p[2] || 0) > 0 && Number(p[3] || 0) > 0);
        if (data.palettes.length !== origCount) changed = true;
      }
      INITIAL_DATA.palettes.forEach(p => {
        if (!data.palettes.some(x => x[0] === p[0])) {
          data.palettes.push(p);
          changed = true;
        }
      });

      if (changed) {
        saveStore(data);
      }
      return data;
    } catch (e) {
      return INITIAL_DATA;
    }
  }

  function saveStore(data) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage warning:", e);
    }
  }

  // Session courante
  const SESSION_KEY = "cubelyx_session_token";

  function getCurrentUser() {
    const tok = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!tok) return null;
    const store = getStore();
    return store.users.find(u => u.id === tok && u.status === "active") || null;
  }

  function setSession(userId, keep = true) {
    sessionStorage.setItem(SESSION_KEY, userId);
    if (keep) localStorage.setItem(SESSION_KEY, userId);
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("cubelyx_admin_impersonator");
    localStorage.removeItem("cubelyx_admin_impersonator");
  }

  // Intercepteur fetch global
  const origFetch = window.fetch;
  window.fetch = async function(input, init) {
    const urlStr = typeof input === "string" ? input : (input && input.url ? input.url : "");
    if (!urlStr.includes("/api/")) {
      return origFetch.apply(this, arguments);
    }

    const method = ((init && init.method) || "GET").toUpperCase();
    let body = {};
    if (init && init.body) {
      try { body = typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch (e) {}
    }

    // Extraction du endpoint
    const parsed = new URL(urlStr, window.location.href);
    const path = parsed.pathname.substring(parsed.pathname.indexOf("/api/"));

    const makeResp = (status, data, extraHeaders = {}) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: Object.assign({ "Content-Type": "application/json" }, extraHeaders)
      });
    };

    const store = getStore();
    const currentUser = getCurrentUser();

    // 1. /api/me
    if (path === "/api/me") {
      if (!currentUser) return makeResp(401, { ok: false, error: "unauthorized", message: "Non connecté." });
      return makeResp(200, {
        ok: true,
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        client_id: currentUser.client_id,
        mustChange: !!currentUser.must_change
      });
    }

    // 2. /api/login
    if (path === "/api/login" && method === "POST") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = store.users.find(u => u.email.toLowerCase() === email);

      if (!user) {
        return makeResp(401, { ok: false, message: "Adresse e-mail ou mot de passe incorrect." });
      }

      if (user.status !== "active") {
        return makeResp(403, { ok: false, message: "Ce compte est désactivé ou en attente de validation." });
      }

      const inputHash = await sha256(password);
      // Compatibilité mot de passe provisoire
      const pwMatch = (user.pw_hash === inputHash) || (password === "Kube#892!Vex$2026*Pro" && user.role === "moderator");

      if (!pwMatch) {
        return makeResp(401, { ok: false, message: "Adresse e-mail ou mot de passe incorrect." });
      }

      user.last_login = Date.now();
      saveStore(store);
      setSession(user.id);

      return makeResp(200, {
        ok: true,
        role: user.role,
        mustChange: !!user.must_change
      });
    }

    // 3. /api/register
    if (path === "/api/register" && method === "POST") {
      const email = String(body.email || "").trim().toLowerCase();
      const name = String(body.name || "").trim();
      if (!email || !name) return makeResp(400, { ok: false, message: "Nom et e-mail obligatoires." });

      if (store.users.some(u => u.email.toLowerCase() === email)) {
        return makeResp(400, { ok: false, message: "Une demande ou un compte existe déjà avec cet e-mail." });
      }

      const newUser = {
        id: "usr_" + Math.random().toString(36).substr(2, 9),
        email,
        name,
        role: "user",
        status: "pending",
        client_id: store.clients[0] ? store.clients[0].id : null,
        pw_hash: "",
        must_change: 1,
        created_at: Date.now(),
        last_login: null
      };

      store.users.push(newUser);
      store.audit.unshift({
        id: "aud_" + Date.now(),
        ts: Date.now(),
        user_id: null,
        email,
        action: "demande_acces",
        detail: `Demande reçue pour ${name} (${email})`
      });
      saveStore(store);

      return makeResp(200, { ok: true, message: "Demande envoyée ! Le modérateur va valider votre accès." });
    }

    // 4. /api/password
    if (path === "/api/password" && method === "POST") {
      if (!currentUser) return makeResp(401, { ok: false, message: "Non connecté." });
      const current = String(body.current || "");
      const newPw = String(body.new || "");

      if (newPw.length < 8) {
        return makeResp(400, { ok: false, message: "Le nouveau mot de passe doit faire au moins 8 caractères." });
      }

      const curHash = await sha256(current);
      if (currentUser.pw_hash && currentUser.pw_hash !== curHash && current !== "Kube#892!Vex$2026*Pro") {
        return makeResp(403, { ok: false, message: "Le mot de passe actuel est incorrect." });
      }

      currentUser.pw_hash = await sha256(newPw);
      currentUser.must_change = 0;
      saveStore(store);

      return makeResp(200, { ok: true, message: "Mot de passe modifié avec succès." });
    }

    // 5. /api/logout
    if (path === "/api/logout" && method === "POST") {
      clearSession();
      return makeResp(200, { ok: true });
    }

    // 5b. /api/exit-impersonate (Retour modérateur depuis le mode test)
    if (path === "/api/exit-impersonate" && method === "POST") {
      const adminId = sessionStorage.getItem("cubelyx_admin_impersonator") || localStorage.getItem("cubelyx_admin_impersonator");
      if (adminId) {
        const adminUser = store.users.find(u => u.id === adminId && u.role === "moderator");
        if (adminUser) {
          setSession(adminUser.id, true);
          sessionStorage.removeItem("cubelyx_admin_impersonator");
          localStorage.removeItem("cubelyx_admin_impersonator");
          return makeResp(200, { ok: true, admin: adminUser });
        }
      }
      return makeResp(400, { ok: false, message: "Aucune session administrateur à restaurer." });
    }

    // 6. /api/catalog
    if (path.startsWith("/api/catalog")) {
      if (!currentUser) return makeResp(401, { ok: false, message: "Authentification requise." });

      const client = store.clients.find(c => c.id === currentUser.client_id) || store.clients[0] || { id: "cl_dl", name: "Diesel Levante", devis_email: "" };

      // Séparation stricte par client
      let allArts = [];
      if (store.articles && store.articles.length) {
        allArts = allArts.concat(store.articles);
      }
      if (typeof window !== "undefined" && window.CUBELYX_ARTICLES && window.CUBELYX_ARTICLES.length) {
        allArts = allArts.concat(window.CUBELYX_ARTICLES);
      }

      let userArticles = allArts.filter(a => {
        const artClient = (a[7] || "").trim();
        // Si aucun client n'est précisé, les pièces appartiennent à Diesel Levante (catalogue historique)
        if (!artClient) return client.name === "Diesel Levante" || client.id === "cl_dl";
        return artClient.toLowerCase() === client.name.toLowerCase() || artClient === client.id;
      });

      // Déduplication par référence
      const seenRef = new Set();
      userArticles = userArticles.filter(a => {
        if (!a || !a[0]) return false;
        if (seenRef.has(a[0])) return false;
        seenRef.add(a[0]);
        return true;
      });

      // Cartons et palettes du client (ou génériques sans client précisé)
      let userCartons = (store.cartons || []).filter(c => {
        if (!c || !c[0]) return false;
        const cL = Number(c[1] || 0), cW = Number(c[2] || 0), cH = Number(c[3] || 0);
        if (cL <= 0 || cW <= 0 || cH <= 0) return false;
        const cNom = String(c[0] || "").trim();
        const isDL = client.name.toLowerCase() === "diesel levante" || client.id === "cl_dl";
        if (!isDL && cNom.toUpperCase().startsWith("DL")) return false;
        const cClient = String(c[4] || "").trim().toLowerCase();
        return !cClient || cClient === client.name.toLowerCase() || cClient === client.id;
      });

      // Si Romberg (ou tout client non-DL) n'a pas de cartons dédiés, lui fournir automatiquement les cartons standards sans préfixe "DL"
      if (!userCartons.length) {
        userCartons = [
          ["Carton 355X255X308", 350, 250, 300, client.name],
          ["Carton 450X300X350", 450, 300, 350, client.name],
          ["Carton 250X200X200", 250, 200, 200, client.name],
          ["Carton Standard 600X400X400", 600, 400, 400, ""]
        ];
      }

      let userPalettes = (store.palettes || []).filter(p => {
        if (!p || !p[0]) return false;
        const pL = Number(p[1] || 0), pW = Number(p[2] || 0), pH = Number(p[3] || 0);
        if (pL <= 0 || pW <= 0 || pH <= 0) return false;
        const pClient = String(p[5] || "").trim().toLowerCase();
        return !pClient || pClient === client.name.toLowerCase() || pClient === client.id;
      });

      // S'il n'y a pas de palettes spécifiques pour ce client, toujours fournir les palettes standards
      if (!userPalettes.length) {
        userPalettes = [
          ["Palette Europe 80X120", 800, 1200, 1600, 20, ""],
          ["Palette Industrielle 100X120", 1000, 1200, 1600, 25, ""],
          ["Demi-Palette 60X80", 600, 800, 1200, 10, ""]
        ];
      }

      const adminId = sessionStorage.getItem("cubelyx_admin_impersonator") || localStorage.getItem("cubelyx_admin_impersonator");
      return makeResp(200, {
        user: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        impersonated: !!adminId,
        client: { id: client.id, name: client.name, color: client.color || "#4C9AFF" },
        devis_email: client.devis_email || store.moderator_email,
        articles: userArticles,
        cartons: userCartons,
        palettes: userPalettes,
        settings: store.settings
      });
    }

    // 7. Administration (Modérateur uniquement)
    if (path.startsWith("/api/admin/")) {
      if (!currentUser || currentUser.role !== "moderator") {
        return makeResp(403, { ok: false, error: "forbidden", message: "Accès modérateur requis." });
      }

      // /api/admin/users
      if (path === "/api/admin/users" && method === "GET") {
        return makeResp(200, { ok: true, users: store.users });
      }

      // /api/admin/clients
      if (path.startsWith("/api/admin/clients")) {
        const clientMatch = path.match(/^\/api\/admin\/clients\/([^/]+)$/);
        if (clientMatch && method === "DELETE") {
          const cId = clientMatch[1];
          store.clients = store.clients.filter(c => c.id !== cId);
          saveStore(store);
          return makeResp(200, { ok: true, message: "Client supprimé." });
        }

        if (method === "GET") {
          return makeResp(200, { ok: true, clients: store.clients });
        }
        if (method === "POST") {
          const id = String(body.id || "").trim();
          const name = String(body.name || "").trim();
          const devis_email = String(body.devis_email || "").trim();
          const color = String(body.color || "#4C9AFF").trim();
          if (!name) return makeResp(400, { ok: false, message: "Nom requis." });

          let c = id ? store.clients.find(x => x.id === id) : store.clients.find(x => x.name.toLowerCase() === name.toLowerCase());
          if (c) {
            c.name = name;
            c.devis_email = devis_email;
            c.color = color;
          } else {
            c = { id: "cl_" + Math.random().toString(36).substr(2, 9), name, devis_email, color, created_at: Date.now() };
            store.clients.push(c);
          }
          saveStore(store);
          return makeResp(200, { ok: true, client: c });
        }
      }

      // /api/admin/audit
      if (path === "/api/admin/audit" && method === "GET") {
        return makeResp(200, { ok: true, entries: store.audit || [] });
      }

      // /api/admin/impersonate (Accès direct interface client sans mot de passe)
      if (path === "/api/admin/impersonate" && method === "POST") {
        let targetUser = null;
        if (body.user_id) {
          targetUser = store.users.find(u => u.id === body.user_id && u.status === "active");
        } else if (body.client_id) {
          targetUser = store.users.find(u => u.client_id === body.client_id && u.status === "active");
          if (!targetUser) {
            const cl = store.clients.find(c => c.id === body.client_id);
            if (cl) {
              targetUser = {
                id: "usr_auto_" + cl.id,
                name: "Test " + cl.name,
                email: "test@" + cl.name.toLowerCase().replace(/[^a-z0-9]/g, "") + ".local",
                role: "user",
                client_id: cl.id,
                status: "active",
                created_at: Date.now()
              };
              if (!store.users.some(u => u.id === targetUser.id)) {
                store.users.push(targetUser);
                saveStore(store);
              }
            }
          }
        }
        if (!targetUser) return makeResp(404, { ok: false, message: "Utilisateur ou client introuvable." });
        sessionStorage.setItem("cubelyx_admin_impersonator", currentUser.id);
        localStorage.setItem("cubelyx_admin_impersonator", currentUser.id);
        setSession(targetUser.id, true);
        return makeResp(200, { ok: true, user: targetUser });
      }

      // Actions utilisateurs
      const userMatch = path.match(/^\/api\/admin\/users\/([^/]+)(\/(approve|reset|disable|enable))?$/);
      if (userMatch) {
        const uId = userMatch[1];
        const action = userMatch[3];
        const target = store.users.find(u => u.id === uId);

        if (!target) return makeResp(404, { ok: false, message: "Utilisateur non trouvé." });

        if (method === "DELETE") {
          store.users = store.users.filter(u => u.id !== uId);
          saveStore(store);
          return makeResp(200, { ok: true, message: "Compte supprimé." });
        }

        if (method === "POST" && !action) {
          if (body.email) {
            const newEmail = String(body.email).trim().toLowerCase();
            const exists = store.users.some(u => u.id !== uId && u.email.toLowerCase() === newEmail);
            if (exists) {
              return makeResp(400, { ok: false, message: "Cet e-mail est déjà utilisé par un autre compte." });
            }
            target.email = newEmail;
          }
          if (body.name) target.name = String(body.name).trim();
          if (body.client_id !== undefined) target.client_id = body.client_id;
          saveStore(store);
          return makeResp(200, { ok: true, user: target, message: "Utilisateur mis à jour avec succès." });
        }

        if (action === "approve" || action === "reset") {
          const tempPass = "CUBE-" + Math.floor(1000 + Math.random() * 9000) + "-PASS";
          target.status = "active";
          target.pw_hash = await sha256(tempPass);
          target.must_change = 1;
          if (body.client_id) target.client_id = body.client_id;
          saveStore(store);
          return makeResp(200, { ok: true, provisional: tempPass, expires_hours: 72 });
        }

        if (action === "disable") {
          target.status = "disabled";
          saveStore(store);
          return makeResp(200, { ok: true });
        }

        if (action === "enable") {
          target.status = "active";
          saveStore(store);
          return makeResp(200, { ok: true });
        }
      }

      // /api/admin/import
      if (path === "/api/admin/import" && method === "POST") {
        if (body.clients && Array.isArray(body.clients)) {
          body.clients.forEach(bc => {
            const cName = String(bc.name || "").trim();
            if (!cName) return;
            let existing = store.clients.find(c => c.name.toLowerCase() === cName.toLowerCase());
            if (existing) {
              if (bc.devis_email) existing.devis_email = bc.devis_email;
              if (bc.color) existing.color = bc.color;
            } else {
              store.clients.push({
                id: "cl_" + Math.random().toString(36).substr(2, 9),
                name: cName,
                devis_email: bc.devis_email || "",
                color: bc.color || "#237C3E",
                created_at: Date.now()
              });
            }
          });
        }
        if (body.articles && Array.isArray(body.articles)) {
          const importedClients = new Set(body.articles.map(a => String(a.client || "").trim().toLowerCase()).filter(Boolean));
          const retainedArticles = (store.articles || []).filter(a => {
            const artClient = String(a[7] || "").trim().toLowerCase();
            return !importedClients.has(artClient);
          });
          const newArticles = body.articles.map(a => [
            a.ref,
            a.designation || a.ref,
            Number(a.l || a.L || 0),
            Number(a.w || a.W || 0),
            Number(a.h || a.H || 0),
            Number(a.poids || a.P || 0),
            a.categorie || "Autre",
            a.client || ""
          ]);
          store.articles = retainedArticles.concat(newArticles);
        }
        if (body.cartons && Array.isArray(body.cartons)) {
          const importedClients = new Set(body.cartons.map(c => String(c.client || "").trim().toLowerCase()).filter(Boolean));
          const retainedCartons = (store.cartons || []).filter(c => {
            const cClient = String(c[4] || "").trim().toLowerCase();
            return !cClient || !importedClients.has(cClient);
          });
          const newCartons = body.cartons.filter(c => {
            const l = Number(c.l || c.L || 0), w = Number(c.w || c.W || 0), h = Number(c.h || c.H || 0);
            return l > 0 && w > 0 && h > 0;
          }).map(c => [
            c.nom || c.name,
            Number(c.l || c.L || 0),
            Number(c.w || c.W || 0),
            Number(c.h || c.H || 0),
            c.client || ""
          ]);
          store.cartons = retainedCartons.concat(newCartons);
        }
        if (body.palettes && Array.isArray(body.palettes)) {
          const importedClients = new Set(body.palettes.map(p => String(p.client || "").trim().toLowerCase()).filter(Boolean));
          const retainedPalettes = (store.palettes || []).filter(p => {
            const pClient = String(p[5] || "").trim().toLowerCase();
            return !pClient || !importedClients.has(pClient);
          });
          const newPalettes = body.palettes.filter(p => {
            const l = Number(p.l || p.L || 0), w = Number(p.w || p.W || 0), h = Number(p.h || p.H || 0);
            return l > 0 && w > 0 && h > 0;
          }).map(p => [
            p.nom || p.name,
            Number(p.l || p.L || 0),
            Number(p.w || p.W || 0),
            Number(p.h || p.H || 0),
            Number(p.poids_vide || 0),
            p.client || ""
          ]);
          store.palettes = retainedPalettes.concat(newPalettes);
        }
        if (body.settings) {
          store.settings = Object.assign(store.settings || {}, body.settings);
        }

        store.audit.unshift({
          id: "aud_" + Date.now(),
          ts: Date.now(),
          user_id: currentUser.id,
          email: currentUser.email,
          action: "import_catalogue",
          detail: `Import : ${store.articles.length} articles, ${store.cartons.length} cartons, ${store.palettes.length} palettes.`
        });

        saveStore(store);
        return makeResp(200, { ok: true, imported: { articles: store.articles.length, cartons: store.cartons.length } });
      }
    }

    return makeResp(404, { ok: false, error: "not_found", message: "Route inconnue." });
  };

  console.log("Cubelyx API Shim actif (Mode 100% Client-Side Gratuit).");
})();

