import expect from "expect";
import find from "lodash/find";

import {
  transformPath,
  convertToJsonPatch,
  applyPatch,
  mergeConfigsPatch,
} from "./Patcher";

const plugins = [
  {
    name: "Home",
  },
  {
    name: "Home",
    CFG: {},
  },
  {
    name: "FeatureEditor",
  },
  {
    name: "WFSDownload",
  },
];

const localConfig = {
  plugins: { desktop: plugins },
};

const patches = [
  { op: "remove", jsonpath: "$.plugins.desktop..[?(@.name == 'Home')]" },
  {
    op: "remove",
    jsonpath: "$.plugins.desktop..[?(@.name == 'FeatureEditor')]",
  },
  { op: "remove", path: "/plugins/desktop/0" },
];

describe("Patch Utils", () => {
  describe("transformPath", () => {
    it("with jsonpath format", () => {
      const paths = [
        { test: ["$", "0", "name"], result: ["/0/name"] },
        {
          test: ["$", "plugins", "desktop", "0", "name"],
          result: ["/plugins/desktop/0/name"],
        },
      ];
      paths.forEach(({ test, result }) =>
        expect(transformPath([test])).toEqual(result)
      );
    });
    it("with jsonPatch format", () => {
      const paths = [
        { test: "/plugins/desktop/0/name", result: "/plugins/desktop/0/name" },
      ];
      paths.forEach(({ test, result }) =>
        expect(transformPath(test)).toEqual(result)
      );
    });
  });
  describe("convertToJsonPatch", () => {
    it("with multiple results per rule", () => {
      const transformed = convertToJsonPatch(localConfig, [patches[0]]);
      expect(transformed).toEqual([
        { op: "remove", path: "/plugins/desktop/0" },
        { op: "remove", path: "/plugins/desktop/1" },
      ]);
    });
    it("with jsonPatch rule with path as key", () => {
      const transformed = convertToJsonPatch(localConfig, [patches[2]]);
      expect(transformed).toEqual([
        { op: "remove", path: "/plugins/desktop/0" },
      ]);
    });
    it("with json patch paths", () => {
      const transformed = convertToJsonPatch(localConfig, [patches[1]]);
      expect(transformed).toEqual([
        { op: "remove", path: "/plugins/desktop/2" },
      ]);
    });
    it("with no results", () => {
      const transformed = convertToJsonPatch(localConfig, [
        { op: "remove", jsonpath: "$..undef", value: "" },
      ]);
      expect(transformed).toEqual([]);
    });
  });
  describe("applyPatch", () => {
    it("applying two rules generated from 1 jsonpath rule ", () => {
      const full = require("./mergeConfigs/fullConfig.json");
      const multipleRule = {
        op: "remove",
        jsonpath: "$.plugins.desktop..[?(@.name == 'Home')]",
      };
      const config = applyPatch(full, multipleRule);
      expect(config.plugins.desktop).toEqual([
        { name: "FeatureEditor" },
        { name: "WFSDownload" },
      ]);
    });
    it("applying 1 rule generated from 1 jsonpath rule ", () => {
      const full = require("./mergeConfigs/fullConfig.json");
      const multipleRule = {
        op: "remove",
        jsonpath: "$.plugins.desktop..[?(@.name == 'FeatureEditor')]",
      };
      const config = applyPatch(full, multipleRule);
      expect(config.plugins.desktop).toEqual([
        { name: "Home" },
        { name: "Home", CFG: {} },
        { name: "WFSDownload" },
      ]);
    });
    it("should not return undefined if passed a wrong rule ", () => {
      const fully = require("./mergeConfigs/fullConfig.json");
      const wrongRule = { op: "remove", jsonpath: "$.plugins.wrong" };
      const config = applyPatch(fully, wrongRule);
      expect(config.plugins.desktop).toEqual([
        {
          name: "Home",
        },
        {
          name: "Home",
          CFG: {},
        },
        {
          name: "FeatureEditor",
        },
        {
          name: "WFSDownload",
        },
      ]);
    });
  });
  describe("mergeConfigsPatch", () => {
    it("remove two adjacent plugins", () => {
      const full = require("./mergeConfigs/fullConfig.json");
      const multipleRule = require("./mergeConfigs/multipleRule.patch.json");
      try {
        const config = mergeConfigsPatch(full, multipleRule);
        expect(config.plugins.desktop.length).toEqual(2);
        expect(config.plugins.desktop).toEqual([
          {
            name: "FeatureEditor",
          },
          {
            name: "WFSDownload",
          },
        ]);
      } catch (e) {
        expect(e).toBe(false);
      }
    });
    it("remove three adjacent plugins, the first two in a patch file, the other in the next one", () => {
      const full = require("./mergeConfigs/fullConfig.json");
      const multipleRule = require("./mergeConfigs/multipleRule.patch.json");
      const multipleRule2 = require("./mergeConfigs/multipleRule2.patch.json");
      try {
        const config = mergeConfigsPatch(full, [
          ...multipleRule,
          ...multipleRule2,
        ]);
        expect(config.plugins.desktop.length).toEqual(1);
        expect(config.plugins.desktop).toEqual([
          {
            name: "WFSDownload",
          },
        ]);
      } catch (e) {
        expect(e).toBe(false);
      }
    });
    it("remove three adjacent plugins, the first one in a patch file, the others two in the next one", () => {
      const full = require("./mergeConfigs/fullConfig.json");
      const multipleRule = require("./mergeConfigs/multipleRule.patch.json");
      const multipleRule2 = require("./mergeConfigs/multipleRule2.patch.json");
      try {
        const config = mergeConfigsPatch(full, [
          ...multipleRule2,
          ...multipleRule,
        ]);
        expect(config.plugins.desktop.length).toEqual(1);
        expect(config.plugins.desktop).toEqual([
          {
            name: "WFSDownload",
          },
        ]);
      } catch (e) {
        expect(e).toBe(false);
      }
    });
    it("remove three adjacent plugins, add a new one, replace its cfg ", () => {
      const full = require("./mergeConfigs/fullConfig.json");
      const multipleRule = require("./mergeConfigs/multipleRule.patch.json");
      const multipleRule2 = require("./mergeConfigs/multipleRule2.patch.json");
      const multipleRule3 = require("./mergeConfigs/multipleRule3.patch.json");
      try {
        const config = mergeConfigsPatch(full, [
          ...multipleRule,
          ...multipleRule2,
          ...multipleRule3,
        ]);
        expect(config.plugins.desktop.length).toEqual(2);
        expect(config.plugins.desktop).toEqual([
          {
            name: "WFSDownload",
          },
          {
            name: "NewPlugin",
            cfg: {
              otherParam: false,
            },
          },
        ]);
      } catch (e) {
        expect(e).toBe(false);
      }
    });
    it("add a plugin in between two specific plugins", () => {
      const full = require("./mergeConfigs/fullConfig.json");
      const multipleRule4 = require("./mergeConfigs/multipleRule4.patch.json");
      try {
        const config = mergeConfigsPatch(full, multipleRule4);
        expect(config.plugins.desktop.length).toEqual(5);
        expect(config.plugins.desktop).toEqual([
          {
            name: "Home",
          },
          {
            name: "Home",
            CFG: {},
          },
          {
            name: "NewPlugin",
            cfg: {
              someParam: true,
            },
          },
          {
            name: "FeatureEditor",
          },
          {
            name: "WFSDownload",
          },
        ]);
      } catch (e) {
        expect(e).toBe(false);
      }
    });
    it("add a plugin in between two specific plugins and removing one after it", () => {
      const full = require("./mergeConfigs/fullConfig.json");
      const multipleRule5 = require("./mergeConfigs/multipleRule5.patch.json");
      try {
        const config = mergeConfigsPatch(full, multipleRule5);
        expect(config.plugins.desktop.length).toEqual(4);
        expect(config.plugins.desktop).toEqual([
          {
            name: "Home",
          },
          {
            name: "Home",
            CFG: {},
          },
          {
            name: "NewPlugin",
            cfg: {
              someParam: true,
            },
          },
          {
            name: "WFSDownload",
          },
        ]);
      } catch (e) {
        expect(e).toBe(false);
      }
    });
    it("testing multiple jsonpatch rules based on two different jsonpath rules", () => {
      const plugins03 = require("./mergeConfigs/03_project_pluginsMultiple.patch.json");
      const full = require("./mergeConfigs/04_full_localConfig.json");
      try {
        const config = mergeConfigsPatch(full, plugins03);
        expect(config).toBeTruthy();
        expect(
          find(config.plugins.mobile, ({ name }) => name === "Search").cfg
            .searchOptions.services[0].options.replacedEverywhereSecondRule
        ).toBeTruthy();

        expect(
          find(config.plugins.desktop, ({ name }) => name === "Search").cfg
            .searchOptions.services[0].options.replacedEverywhereSecondRule
        ).toBeTruthy();

        expect(
          find(config.plugins.embedded, ({ name }) => name === "Search").cfg
            .searchOptions.services[0].options.replacedEverywhereSecondRule
        ).toBeTruthy();
      } catch (e) {
        expect(e).toBe(false);
      }
    });
    it("Complete test with a real scenario", () => {
      const rootVars = require("./mergeConfigs/01_project_rootVars.patch.json");
      const stateVars = require("./mergeConfigs/02_project_stateVars.patch.json");
      const pluginsTest = require("./mergeConfigs/05_project_plugins.patch.json");
      const full = require("./mergeConfigs/04_full_localConfig.json");
      try {
        const config = mergeConfigsPatch(full, [
          ...rootVars,
          ...stateVars,
          ...pluginsTest,
        ]);
        expect(config).toBeTruthy();
        expect(config.mailingList).toBeFalsy();
        expect(config.proxyUrl.useCORS.length).toBe(4);
        expect(
          find(config.plugins.desktop, ({ name }) => name === "LayerInfo")
        ).toBeTruthy();
        expect(
          find(
            config.plugins.desktop,
            ({ name }) => name === "IdentifySettings"
          )
        ).toBeTruthy();
      } catch (e) {
        expect(e).toBe(false);
      }
    });
  });
});
