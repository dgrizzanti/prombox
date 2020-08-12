/*
 * *
 *  Copyright 2020 Comcast Cable Communications Management, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 * /
 */

import { mount, createLocalVue } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import createStoreConfig from "@/store/config.js";
import PrometheusRuntime from "@/components/PrometheusRuntime.vue";
import Api from "@/services/Api.js";

const localVue = createLocalVue();
localVue.use(Vuex);

const mockStore = new Vuex.Store(createStoreConfig());

jest.mock("@/services/Api.js", () => ({
  getPrometheusRuntime: jest.fn(),
  getPrometheusBuild: jest.fn()
}));

beforeEach(() => {
  mockStore.state.notification.list = [];
  mockStore.state.notification.nextId = 1;
  Api.getPrometheusRuntime.mockReset();
  Api.getPrometheusBuild.mockReset();
});

describe("PrometheusRuntime", () => {
  test("display runtime and build info", async () => {
    const mockRuntime = {
      startTime: "2019-11-02T17:23:59.301361365+01:00",
      CWD: "/",
      reloadConfigSuccess: true
    };
    Api.getPrometheusRuntime.mockImplementation(() => {
      return Promise.resolve({
        status: 200,
        statusText: "Ok",
        data: {
          status: "success",
          data: mockRuntime
        }
      });
    });
    const mockBuild = {
      version: "2.13.1",
      revision: "cb7cbad5f9a2823a622aaa668833ca04f50a0ea7",
      branch: "master"
    };
    Api.getPrometheusBuild.mockImplementation(() => {
      return Promise.resolve({
        status: 200,
        statusText: "Ok",
        data: {
          status: "success",
          data: mockBuild
        }
      });
    });

    const wrapper = mount(PrometheusRuntime, {
      localVue,
      store: mockStore
    });

    await Vue.nextTick(); //wait for API call to finish
    expect(Api.getPrometheusRuntime).toHaveBeenCalledTimes(1);
    expect(Api.getPrometheusBuild).toHaveBeenCalledTimes(1);

    expect(
      wrapper
        .findAll("h1")
        .at(0)
        .exists()
    ).toBeTruthy();
    expect(
      wrapper
        .findAll("h1")
        .at(0)
        .text()
    ).toBe("Runtime Information");
    expect(wrapper.find("pre#runtime").exists()).toBeTruthy();
    expect(wrapper.find("pre#runtime").text()).toBe(
      JSON.stringify(mockRuntime, null, 2)
    );

    expect(
      wrapper
        .findAll("h1")
        .at(1)
        .exists()
    ).toBeTruthy();
    expect(
      wrapper
        .findAll("h1")
        .at(1)
        .text()
    ).toBe("Build Information");
    expect(wrapper.find("pre#build").exists()).toBeTruthy();
    expect(wrapper.find("pre#build").text()).toBe(
      JSON.stringify(mockBuild, null, 2)
    );

    expect(mockStore.state.notification.list.length).toBe(0);
  });

  test("add error notification if api call fails", async () => {
    Api.getPrometheusRuntime.mockImplementation(() => {
      return Promise.resolve({
        status: 200,
        statusText: "Ok",
        data: {
          status: "error",
          data: "Prometheus reporting a weird error"
        }
      });
    });
    Api.getPrometheusBuild.mockImplementation(() => {
      return Promise.resolve({
        status: 200,
        statusText: "Ok",
        data: {
          status: "error",
          data: "Prometheus reporting a weird error"
        }
      });
    });

    const wrapper = mount(PrometheusRuntime, {
      localVue,
      store: mockStore
    });

    await Vue.nextTick(); //wait for API call to finish
    expect(Api.getPrometheusRuntime).toHaveBeenCalledTimes(1);
    expect(Api.getPrometheusBuild).toHaveBeenCalledTimes(1);

    expect(wrapper.find("pre#runtime").text()).toBe("");
    expect(wrapper.find("pre#build").text()).toBe("");

    expect(mockStore.state.notification.list.length).toBe(2);
    expect(mockStore.state.notification.list[0]).toMatchObject({
      type: "error",
      message: "There was a problem fetching prometheus runtime info.",
      details: '{"status":"error","data":"Prometheus reporting a weird error"}'
    });
    expect(mockStore.state.notification.list[1]).toMatchObject({
      type: "error",
      message: "There was a problem fetching prometheus build info.",
      details: '{"status":"error","data":"Prometheus reporting a weird error"}'
    });
  });

  test("add error notification if api call throws error", async () => {
    Api.getPrometheusRuntime.mockImplementation(() => {
      return Promise.reject({
        response: {
          status: 500,
          statusText: "Internal Server Error",
          data: "Something went wrong"
        }
      });
    });
    Api.getPrometheusBuild.mockImplementation(() => {
      return Promise.reject({
        response: {
          status: 500,
          statusText: "Internal Server Error",
          data: "Something went wrong"
        }
      });
    });

    const wrapper = mount(PrometheusRuntime, {
      localVue,
      store: mockStore
    });

    await Vue.nextTick(); //wait for API call to finish
    expect(Api.getPrometheusRuntime).toHaveBeenCalledTimes(1);
    expect(Api.getPrometheusBuild).toHaveBeenCalledTimes(1);

    expect(wrapper.find("pre#runtime").text()).toBe("");
    expect(wrapper.find("pre#build").text()).toBe("");

    expect(mockStore.state.notification.list.length).toBe(2);
    expect(mockStore.state.notification.list[0]).toMatchObject({
      type: "error",
      message: "There was a problem fetching prometheus runtime info.",
      details: '500 Internal Server Error: "Something went wrong"'
    });
    expect(mockStore.state.notification.list[1]).toMatchObject({
      type: "error",
      message: "There was a problem fetching prometheus build info.",
      details: '500 Internal Server Error: "Something went wrong"'
    });
  });
});