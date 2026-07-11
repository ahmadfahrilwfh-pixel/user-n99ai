/**
 * N99 AI ORGANISM — MT5 Broker Server Catalog (UI UX Promax)
 * Institutional-grade server list for Select2 combobox on panel_broker.html.
 * tags:true allows manual entry of unlisted servers.
 */
(function () {
  "use strict";

  /** @type {string[]} */
  var SERVER_NAMES = [
    /* ── MetaQuotes reference ── */
    "MetaQuotes-Demo",

    /* ── Versus Trade ── */
    "VersusTrade-Live1",
    "VersusTrade-Demo",
    "VersusTrade-MT5",
    "VersusTrade-MT5-Live",
    "VersusTrade-MT5-Demo",

    /* ── Indonesia — Bappebti / local MT5 ── */
    "MIFX-MT5",
    "MIFX-Demo",
    "MIFX-Live",
    "Finex-Live",
    "Finex-Demo",
    "Finex-MT5",
    "GKInvest-MT5",
    "GKInvest-Live",
    "GKInvest-Demo",
    "Valbury-Live",
    "Valbury-Demo",
    "Valbury-MT5",
    "HSB-Real",
    "HSB-Demo",
    "HSB-MT5",
    "Agrodana-Live",
    "Agrodana-Demo",
    "Agrodana-MT5",
    "Monex-Live",
    "Monex-Demo",
    "Monex-MT5",
    "MonexInvestor-Live",
    "MonexInvestor-Demo",
    "Didimax-Live",
    "Didimax-Demo",
    "Maxco-Live",
    "Maxco-Demo",
    "Lotus-Live",
    "Lotus-Demo",
    "RFX-Live",
    "RFX-Demo",
    "TPFutures-Live",
    "TPFutures-Demo",
    "Mahadana-Live",
    "Mahadana-Demo",
    "IndoPremier-Live",
    "IndoPremier-Demo",
    "SoedeX-Live",
    "SoedeX-Demo",
    "AsiaTrade-Live",
    "AsiaTrade-Demo",
    "JFX-Live",
    "JFX-Demo",

    /* ── Exness — Trial & Real 1–15 ── */
    "Exness-MT5Trial",
    "Exness-MT5Trial2",
    "Exness-MT5Trial3",
    "Exness-MT5Trial4",
    "Exness-MT5Trial5",
    "Exness-MT5Trial6",
    "Exness-MT5Trial7",
    "Exness-MT5Trial8",
    "Exness-MT5Trial9",
    "Exness-MT5Trial10",
    "Exness-MT5Trial11",
    "Exness-MT5Trial12",
    "Exness-MT5Trial13",
    "Exness-MT5Trial14",
    "Exness-MT5Trial15",
    "Exness-MT5Trial17",
    "Exness-MT5Real",
    "Exness-MT5Real2",
    "Exness-MT5Real3",
    "Exness-MT5Real4",
    "Exness-MT5Real5",
    "Exness-MT5Real6",
    "Exness-MT5Real7",
    "Exness-MT5Real8",
    "Exness-MT5Real9",
    "Exness-MT5Real10",
    "Exness-MT5Real11",
    "Exness-MT5Real12",
    "Exness-MT5Real13",
    "Exness-MT5Real14",
    "Exness-MT5Real15",

    /* ── FBS ── */
    "FBS-Demo",
    "FBS-Real",
    "FBS-Real-2",
    "FBS-Real-3",
    "FBS-MT5",

    /* ── XM Global ── */
    "XMGlobal-MT5",
    "XMGlobal-MT5 2",
    "XMGlobal-MT5 3",
    "XMGlobal-Real",
    "XMGlobal-Real 2",
    "XMGlobal-Demo",
    "XMGlobal-Demo 2",
    "XMGlobal-Demo 3",

    /* ── IC Markets ── */
    "ICMarketsSC-MT5",
    "ICMarketsSC-Demo",
    "ICMarketsSC-Live",
    "ICMarkets-MT5",
    "ICMarkets-Demo",
    "ICMarkets-Live",
    "ICMarketsEU-MT5",
    "ICMarketsEU-Demo",

    /* ── Tickmill ── */
    "Tickmill-Demo",
    "Tickmill-Live",
    "Tickmill-Live02",
    "Tickmill-Live03",
    "TickmillEU-Live",
    "TickmillEU-Demo",
    "TickmillUK-Live",

    /* ── HFM (HotForex) ── */
    "HFMarketsGlobal-Live",
    "HFMarketsGlobal-Demo",
    "HFMarketsSV-Live Server",
    "HFMarketsSV-Demo Server",
    "HFMarkets-Live",
    "HFMarkets-Demo",
    "HFM-Live",
    "HFM-Demo",

    /* ── JustMarkets ── */
    "JustMarkets-Live",
    "JustMarkets-Live2",
    "JustMarkets-Demo",
    "JustMarkets-Demo2",
    "JustMarkets-MT5",

    /* ── OctaFX ── */
    "OctaFX-Real",
    "OctaFX-Real2",
    "OctaFX-Demo",
    "OctaFX-MT5",

    /* ── Deriv ── */
    "Deriv-Demo",
    "Deriv-Server",
    "DerivSVG-Server",
    "DerivBVI-Server",

    /* ── Pepperstone ── */
    "Pepperstone-MT5Live01",
    "Pepperstone-MT5Live02",
    "Pepperstone-Demo",
    "Pepperstone-Live",
    "Pepperstone-MT5-Demo",

    /* ── Vantage ── */
    "Vantage International-Live",
    "Vantage International-Live 2",
    "Vantage International-Live 3",
    "Vantage International-Demo",
    "VantageFX-Live",
    "VantageFX-Demo",
    "Vantage-Live",
    "Vantage-Demo",

    /* ── FTMO / prop ── */
    "FTMO-Demo",
    "FTMO-Server",
    "FTMO-Server2",
    "FTMO-Server3",
    "The5ers-Demo",
    "The5ers-Live",
    "FundedNext-Demo",
    "FundedNext-Live",

    /* ── RoboForex ── */
    "RoboForex-ECN",
    "RoboForex-Pro",
    "RoboForex-Demo",
    "RoboForex-ProCent",

    /* ── Axi ── */
    "Axi-US02-Live",
    "Axi-US03-Live",
    "Axi-US04-Live",
    "Axi-Demo",
    "Axi-Live",
    "AxiCorp-Live",

    /* ── Admirals ── */
    "AdmiralsGroup-Live",
    "AdmiralsGroup-Demo",
    "AdmiralMarkets-Live",
    "AdmiralMarkets-Demo",

    /* ── AvaTrade ── */
    "AvaTrade-Real",
    "AvaTrade-Demo",
    "AvaTrade-MT5",

    /* ── BlackBull ── */
    "BlackBull-Live",
    "BlackBull-Demo",
    "BlackBullMarkets-Live",

    /* ── Eightcap ── */
    "Eightcap-Real",
    "Eightcap-Demo",
    "Eightcap-Live",

    /* ── TitanFX ── */
    "TitanFX-Live",
    "TitanFX-Demo",
    "TitanFX-MT5",

    /* ── FXTM ── */
    "FXTM-ECN",
    "FXTM-Demo",
    "FXTM-ECN-Demo",
    "FXTM-Standard",

    /* ── IronFX ── */
    "IronFX-Live",
    "IronFX-Demo",

    /* ── Alpari ── */
    "Alpari-MT5",
    "Alpari-Demo",
    "Alpari-Live",

    /* ── InstaForex ── */
    "InstaForex-Server",
    "InstaForex-Demo",

    /* ── AAAFx ── */
    "AAAFx-Live",
    "AAAFx-Demo",

    /* ── IC Trading ── */
    "IC Trading-Live",
    "IC Trading-Demo",

    /* ── OANDA ── */
    "OANDA-v20 Live-1",
    "OANDA-v20 Practice-1",
    "OANDA-MT5",

    /* ── IUX Markets ── */
    "IUXMarkets-Demo",
    "IUXMarkets-Live",
    "IUXMarkets-Real",
    "IUXMarkets-MT5",
    "IUXMarkets-Live01",
    "IUXMarkets-Real01",
    "IUX-Demo",
    "IUX-Live",
    "IUX-Real",

    /* ── Fusion Markets ── */
    "FusionMarkets-Live",
    "FusionMarkets-Demo",

    /* ── FP Markets ── */
    "FPMarkets-Live",
    "FPMarkets-Demo",
    "FPMarkets-MT5",

    /* ── Global Prime ── */
    "GlobalPrime-Live",
    "GlobalPrime-Demo",

    /* ── ThinkMarkets ── */
    "ThinkMarkets-Live",
    "ThinkMarkets-Demo",

    /* ── FXOpen ── */
    "FXOpen-Live",
    "FXOpen-Demo",
    "FXOpen-MT5",

    /* ── FXPro ── */
    "FxPro-MT5",
    "FxPro-Live",
    "FxPro-Demo",

    /* ── City Index / StoneX ── */
    "CityIndex-Live",
    "CityIndex-Demo",

    /* ── IG ── */
    "IG-Live",
    "IG-Demo",

    /* ── Saxo ── */
    "Saxo-Live",
    "Saxo-Demo",

    /* ── Swissquote ── */
    "Swissquote-Live",
    "Swissquote-Demo",

    /* ── Dukascopy ── */
    "Dukascopy-Live",
    "Dukascopy-Demo",

    /* ── LiteFinance ── */
    "LiteFinance-Live",
    "LiteFinance-Demo",

    /* ── NordFX ── */
    "NordFX-Live",
    "NordFX-Demo",

    /* ── Weltrade ── */
    "Weltrade-Live",
    "Weltrade-Demo",

    /* ── Exotic / regional ── */
    "Capital.com-Live",
    "Capital.com-Demo",
    "CMCMarkets-Live",
    "CMCMarkets-Demo",
    "Plus500-Live",
    "Plus500-Demo",
  ];

  function dedupeSort(names) {
    var seen = {};
    var out = [];
    names.forEach(function (name) {
      var key = String(name || "").trim();
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(key);
    });
    out.sort(function (a, b) {
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });
    return out;
  }

  var UNIQUE = dedupeSort(SERVER_NAMES);

  /** Select2-compatible flat catalog: { id, text } */
  window.N99_MT5_BROKER_CATALOG = UNIQUE.map(function (name) {
    return { id: name, text: name };
  });

  /**
   * Client-side filter for Select2 local data mode.
   * @param {string} term
   * @param {string} text
   */
  window.N99_brokerServerMatcher = function (term, text) {
    if (!term || !term.trim()) return true;
    var q = term.toLowerCase().trim();
    var blob = String(text || "").toLowerCase();
    return blob.indexOf(q) >= 0;
  };

  /**
   * Initialize Select2 on #userBrokerServer with local catalog + custom tags.
   */
  window.N99_initBrokerServerSelect = function () {
    if (!window.jQuery || !window.jQuery.fn.select2) return false;
    var $ = window.jQuery;
    var $el = $("#userBrokerServer");
    if (!$el.length || $el.data("select2")) return true;

    $el.select2({
      data: window.N99_MT5_BROKER_CATALOG,
      tags: true,
      width: "100%",
      allowClear: false,
      minimumInputLength: 0,
      placeholder: "Search MT5 server or type custom...",
      dropdownCssClass: "n99-select2-hud-dropdown",
      containerCssClass: "n99-select2-hud",
      matcher: function (params, data) {
        if ($.trim(params.term) === "") return data;
        if (typeof data.text === "undefined") return null;
        return window.N99_brokerServerMatcher(params.term, data.text) ? data : null;
      },
      language: {
        noResults: function () {
          return "No match — press Enter to use custom server name";
        },
      },
    });
    return true;
  };

  document.addEventListener("DOMContentLoaded", function () {
    function boot() {
      if (window.N99_initBrokerServerSelect()) return;
      window.setTimeout(boot, 50);
    }
    boot();
  });
})();
