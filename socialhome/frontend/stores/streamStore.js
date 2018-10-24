/* eslint-disable no-param-reassign */
import Vue from "vue"
import Vuex from "vuex"
import Vapi from "vuex-rest-api"
import _defaults from "lodash/defaults"
import _get from "lodash/get"

import getState from "frontend/stores/streamStore.state"
import {actions, mutations, streamStoreOperations, getters} from "frontend/stores/streamStore.operations"


Vue.use(Vuex)

function addHasLoadMore(state) {
    const loadMoreContentId = state.contentIds[state.contentIds.length - 6]
    if (loadMoreContentId) {
        Vue.set(state.contents[loadMoreContentId], "hasLoadMore", true)
    } else {
        // Add to the last to be sure we always add it
        Vue.set(state.contents[state.contentIds[state.contentIds.length - 1]], "hasLoadMore", true)
    }
    state.layoutDoneAfterTwitterOEmbeds = false
}

function fetchContentsSuccess(state, payload) {
    let newItems = 0
    payload.data.forEach(item => {
        const content = Object.assign({}, item, {replyIds: [], shareIds: []})
        Vue.set(state.contents, content.id, content)
        if (state.contentIds.indexOf(content.id) === -1) {
            state.contentIds.push(content.id)
            newItems += 1
        }
    })
    if (newItems > 0) {
        addHasLoadMore(state)
    }
}

function fetchRepliesSuccess(state, payload) {
    let items = payload.data
    if (!Array.isArray(payload.data)) {
        items = [payload.data]
    }
    items.forEach(item => {
        const reply = Object.assign({}, item, {replyIds: [], shareIds: []})
        Vue.set(state.replies, reply.id, reply)
        if (state.contents[reply.parent] !== undefined) {
            if (state.contents[reply.parent].replyIds.indexOf(reply.id) === -1) {
                state.contents[reply.parent].replyIds.push(reply.id)
            }
        } else if (state.shares[reply.parent] !== undefined) {
            if (state.shares[reply.parent].replyIds.indexOf(reply.id) === -1) {
                state.shares[reply.parent].replyIds.push(reply.id)
            }
        }
    })
}

function fetchSharesSuccess(state, payload) {
    payload.data.forEach(item => {
        const share = Object.assign({}, item, {replyIds: []})
        Vue.set(state.shares, share.id, share)
        if (state.contents[share.share_of].shareIds.indexOf(share.id) === -1) {
            state.contents[share.share_of].shareIds.push(share.id)
        }
    })
}

function fetchNewContentSuccess(state, payload) {
    Vue.set(state.contents, payload.data.id, payload.data)
}

function onError() {
    Vue.snotify.error(gettext("An error happened while fetching new content"))
}

function newRestAPI(options) {
    const getLastIdParam = lastId => (lastId ? `?last_id=${lastId}` : "")

    return new Vapi(options)
        .get({
            action: streamStoreOperations.getPublicStream,
            path: ({lastId = undefined}) => `${Urls["api-streams:public"]()}${getLastIdParam(lastId)}`,
            property: "contents",
            onSuccess: fetchContentsSuccess,
            onError,
        })
        .get({
            action: streamStoreOperations.getFollowedStream,
            path: ({lastId = undefined}) => `${Urls["api-streams:followed"]()}${getLastIdParam(lastId)}`,
            property: "contents",
            onSuccess: fetchContentsSuccess,
            onError,
        })
        .get({
            action: streamStoreOperations.getLimitedStream,
            path: ({lastId = undefined}) => `${Urls["api-streams:limited"]()}${getLastIdParam(lastId)}`,
            property: "contents",
            onSuccess: fetchContentsSuccess,
            onError,
        })
        .get({
            action: streamStoreOperations.getLocalStream,
            path: ({lastId = undefined}) => `${Urls["api-streams:local"]()}${getLastIdParam(lastId)}`,
            property: "contents",
            onSuccess: fetchContentsSuccess,
            onError,
        })
        .get({
            action: streamStoreOperations.getTagStream,
            path: ({name, lastId = undefined}) => `${Urls["api-streams:tag"]({name})}${getLastIdParam(lastId)}`,
            property: "contents",
            onSuccess: fetchContentsSuccess,
            onError,
        })
        .get({
            action: streamStoreOperations.getProfileAll,
            path: ({uuid, lastId = undefined}) => `${Urls["api-streams:profile-all"]({uuid})}${getLastIdParam(lastId)}`,
            property: "contents",
            onSuccess: fetchContentsSuccess,
            onError,
        })
        .get({
            action: streamStoreOperations.getProfilePinned,
            path: ({uuid, lastId = undefined}) => `${Urls["api-streams:profile-pinned"]({uuid})}${getLastIdParam(lastId)}`,
            property: "contents",
            onSuccess: fetchContentsSuccess,
            onError,
        })
        .get({
            action: streamStoreOperations.getReplies,
            path: ({uuid}) => Urls["api:content-replies"]({uuid: uuid}),
            property: "replies",
            onSuccess: fetchRepliesSuccess,
            onError,
        })
        .get({
            action: streamStoreOperations.getShares,
            path: ({uuid}) => Urls["api:content-shares"]({uuid: uuid}),
            property: "shares",
            onSuccess: fetchSharesSuccess,
            onError,
        })
        .post({
            action: streamStoreOperations.saveReply,
            path: Urls["api:content-list"],
            property: "reply",
            onSuccess: fetchRepliesSuccess,
            onError,
        })
        .get({
            action: streamStoreOperations.getNewContent,
            path: ({uuid}) => Urls["api:content-detail"]({uuid}),
            property: "contents",
            onSuccess: fetchNewContentSuccess,
            onError,
        })
        .getStore()
}

function getStructure(options) {
    const storePrototype = newRestAPI(_defaults({}, {state: getState()}, options))
    const modules = _get(options, "modules", {})

    storePrototype.mutations = _defaults({}, mutations, storePrototype.mutations)
    storePrototype.actions = _defaults({}, actions, storePrototype.actions)
    storePrototype.getters = _defaults({}, getters, storePrototype.getters)
    storePrototype.modules = _defaults({}, modules, storePrototype.modules)

    return storePrototype
}

function newStreamStore(options = {}) {
    return new Vuex.Store(getStructure(options))
}

const exportsForTests = {
    addHasLoadMore,
    fetchContentsSuccess,
    fetchNewContentSuccess,
    fetchRepliesSuccess,
    fetchSharesSuccess,
    getStructure,
    newRestAPI,
    onError,
}
export {streamStoreOperations, newStreamStore, exportsForTests}
