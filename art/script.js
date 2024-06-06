/**
 * This handles functionality for the page.
 * It calls the Art Institute of Chicago API's artworks and images endpoints to
 * find and display art that is rarely viewed, along with it's info.
 */

"use strict";
(function () {
    // Module-globals
    const USER_AGENT = "mtnLark (lark@caltech.edu)"
    const API_BASE_URL = "https://api.artic.edu/api/v1/"

    // We store these globally to avoid re-running the function many times
    let artFieldString = ""
    let imgFieldString = ""

    const CONTAINER_SELECTOR = "#art-display"
    const IMG_LINK_SELECTOR = "#img-link"
    let container = null

    let numFails = 0
    let shuffleButton = null

    window.addEventListener("load", init)

    //----------------------------------//
    //----- INITIALIZING FUNCTIONS -----//
    //----------------------------------//
    /** Initializes JS functionality for the page. */
    function init() {
        artFieldString = getFieldsString("art")
        imgFieldString = getFieldsString("img")

        container = qs(CONTAINER_SELECTOR)

        shuffleButton = qs("#shuffle-button")
        shuffleButton.addEventListener("click", getNewArt)

        getNewArt()
    }

    /**
     * Fetches new art and updates the page accordingly.
     */
    function getNewArt() {
        enableShuffleButton(false)
        requestAsync()
    }

    /**
     * One-time function to URL-ify the desired API fields, stored in this
     * function as constants.
     *
     * @param {string} type - either "art" or "img"
     * @returns {string} - string to attach to art API request
     */
    function getFieldsString(type) {
        let ART_FIELDS = [
            // Link
            "id",
            // Image
            "image_id",
            // Info
            "title",
            "artist_display",
            "medium_display",
            "place_of_origin",
            "style_title",
            // Styling
            "color",
            "has_not_been_viewed_much",
            "is_public_domain"
        ]
        let IMG_FIELDS = [
            // Alt-Text
            "alt-text",
            // Copyright
            "credit-line",
            // URL
            "iiif_url",
            "width"
        ]

        let fields = []
        if (type == "art") {
            fields = ART_FIELDS
        } else if (type == "img") {
            fields = IMG_FIELDS
        } else {
            throw Error("ValueError: type must be 'art' or 'img'.")
        }

        let str = "/?fields="
        for (let i = 0; i < fields.length; i++) {
            str += fields[i] + ","
        }

        return str
    }

    //-----------------------------//
    //----- NETWORK FUNCTIONS -----//
    //-----------------------------//

    /**
     * Gets the image URL of the artwork for display.
     *
     * @param {string} iiifBaseUrl - the base IIIF URL of the artwork
     * @param {string} iiifPath - the path to append associated with the artwork
     * @param {number} width - the width of the artwork, in px
     * @returns {string} - the URL for displaying the image
     */
    function getImageURL(iiifBaseUrl, iiifPath, width) {
        /**
         * Per https://api.artic.edu/docs/#iiif-image-api
         * ArtIC recommends sizing with width 843.
         * However, this causes issues if the image is smaller than 843 px wide.
         * This is the workaround.
         */
        const DEFAULT_WIDTH = 843

        let sizeStr = `${DEFAULT_WIDTH},/`
        if (width < DEFAULT_WIDTH) {
            sizeStr = "pct:100/"
        }
        const STRUCTURE = "/full/" + sizeStr + "0/default.jpg"
        let url = iiifBaseUrl + iiifPath + STRUCTURE
        return url
    }

    /**
     * Gets the image_id associated with the provided artwork.
     *
     * @param {JSON} artJson - JSON returned by artworks fetch request
     * @returns {string} - Associated image ID
     */
    function getImageId(artJson) {
        // The search endpoint returns an array of data, so we need to unwrap
        return artJson.data[0].image_id
    }

    /**
     * Fetches the JSON info associated with the URL provided, or throws an
     * error.
     *
     * @param {string} artUrl
     * @throws Will throw an error if the fetch has bad status, or the JSON
     *      doesn't have the necessary information
     * @returns {JSON} - JSON associated with artwork fetched
     */
    async function requestArtAsync() {
        /**
         * This is a helper function within a try/catch block, so we won't worry
         * about catching errors here.
         *
         * Written with help of Lecture 13 APOD example.
         *
         * https://rapidapi.com/guides/request-headers-fetch
         */
        const ART_URL = getSearchUrl()

        let artResp = await fetch(ART_URL, {
            headers: {
                // Requested as courtesy
                "AIC-User-Agent": USER_AGENT
            }
        })
        artResp = checkStatus(artResp)        // Check status is valid
        const artData = await artResp.json()  // Convert to json

        return (artData)
    }

    /**
     * Fetches the JSON info associated with the artwork provided, or throws an
     * error.
     *
     * @param {JSON} artJson - JSON returned by artworks fetch request
     * @throws Will throw an error if the fetch has bad status
     * @returns {JSON} - JSON associated with artwork image information fetched
     */
    async function requestImgAsync(artJson) {
        /**
         * This is a helper function within a try/catch block, so we won't worry
         * about catching errors here.
         *
         * Written with help of Lecture 13 APOD example.
         */

        // Get img url
        const IMG_ENDPOINT = "images/"
        const IMG_ID = getImageId(artJson)
        const IMG_URL = API_BASE_URL + IMG_ENDPOINT + IMG_ID + imgFieldString

        // Fetch
        let imgResp = await fetch(IMG_URL, {
            headers: {
                // Requested as courtesy
                "AIC-User-Agent": USER_AGENT
            }
        })
        imgResp = checkStatus(imgResp)        // Check status is valid
        const imgData = await imgResp.json()  // Convert to json

        return (imgData)
    }


    /**
     * Generates the url to fetch artwork info from. Uses the search endpoint to
     * find a random piece of art which is 1. in the public domain; 2. not often
     * viewed; 3. has an associated image.
     *
     * @returns {string} - URL to fetch artwork info from
     */
    function getSearchUrl() {
        // Get random seed
        let seed = Date.now()

        // Search endpoint
        const SEARCH_ENDPOINT = "search"

        // Courtesy of nikhil trivedi at the Art Institute of Chicago
        const PARAMS_STRING = [
            "&query[function_score][query][bool][filter][][term][is_public_domain]=true",
            "&query[function_score][query][bool][filter][][term][has_not_been_viewed_much]=true",
            "&query[function_score][query][bool][filter][][exists][field]=image_id",
            "&query[function_score][boost_mode]=replace",
            "&query[function_score][random_score][field]=id",
            "&resources=artworks&boost=false&limit=1"
        ].join('')
        const SEED_STRING = "&query[function_score][random_score][seed]="
        const ART_URL = API_BASE_URL + SEARCH_ENDPOINT + artFieldString + PARAMS_STRING + SEED_STRING + seed

        return ART_URL
    }

    /**
     * Fetches art data of a random artwork, and validates data.
     */
    async function requestAsync() {
        /**
         * Written with help of Lecture 13 APOD example
         */
        try {
            // First, get artwork information
            let artData = await requestArtAsync()

            // Next, get image information
            let imgData = await requestImgAsync(artData)

            // Update the page
            processData(artData, imgData)           // Process data and update page
            enableShuffleButton(true)               // Release shuffle button

        } catch (err) {
            // Continuous failure; stop checking
            processError(err)
            enableShuffleButton(true)
        }
    }

    //--------------------------------------//
    //----- DOM MANIPULATION FUNCTIONS -----//
    //--------------------------------------//

    /**
     * Enables or disables the shuffle button.
     *
     * @param {boolean} enable
     */
    function enableShuffleButton(enable) {
        /**
         * I know toggle would usually be used here, but I found if I was fast
         * enough, I could lock myself out of using the button, so works better.
         */

        shuffleButton.disabled = !enable
        if (enable) {
            shuffleButton.classList.remove("disabled")
        } else {
            shuffleButton.classList.add("disabled")
        }
    }

    /**
     * Replaces the image with the updated artwork image.
     *
     * @param {JSON} artConfig - .config returned with artwork JSON
     * @param {JSON} imgData - .data returned with images JSON
     */
    function updateImg(artConfig, imgData) {
        // Replace image + link art
        let iiifBaseUrl = artConfig.iiif_url
        let iiifPath = imgData.iiif_url
        let url = getImageURL(iiifBaseUrl, iiifPath, imgData.width)

        let img = qs(CONTAINER_SELECTOR + " img")
        img.src = url
        img.alt = imgData.alt_text
    }

    /**
     * Generates a text element in parent with textContent equal to data if
     * data exists, and "Unknown <name>" or alternate string otherwise.
     *
     * @param {HTMLElement} parent - element to parent items to
     * @param {string} elemStr - string describing the type of element to be
     *      created, as in createElement
     * @param {string} [data] - string to try to use as text
     * @param {string} [alternate] - alternate descriptor to use if data is
     *      null; name of attribute if useUnknown=true, otherwise a complete
     *      replacement string. Can be omitted if data is guaranteed.
     * @param {boolean} [useUnknown=true] useUnknown - indicates whether to use
     *      default "Unknown <alternate>" string or to entirely replace
     * @returns {HTMLElement} - generated HTML element
     */
    function generateDisplayElement(parent, elemStr, data, alternate, useUnknown = true) {
        let elem = gen(elemStr)

        let str = ""
        if (data) {
            // Data found!

            /**
             * `\n` line breaks are not supported, so we make multiple elements
             * if necessary.
             */
            let lines = data.split("\n")
            if (lines.length > 1) {
                for (let i = 0; i < lines.length; i++) {
                    parent = generateDisplayElement(parent, elemStr, lines[i])
                }
                return parent
            }

            // Otherwise, didn't need to make multiple, so use string
            str = data
        } else {
            // Didn't find data, update style and use alternate string
            if (useUnknown) {
                str = "Unknown " + alternate
            } else {
                str = alternate
            }
            elem.classList.add("unknown")
        }
        // Set text and add element to parent
        elem.textContent = str
        parent.appendChild(elem)

        return parent
    }

    /**
     * Generates the aside and its contents associated with the provided artwork
     * information.
     *
     * @param {JSON} artData - .data returned with artwork JSON
     * @param {JSON} imgData - .data returned with images JSON
     * @returns {HTMLElement} - generated aside element
     */
    function generateAside(artData, imgData) {
        // Create new aside from data
        let newAside = gen("aside")

        let header = gen("header")

        generateDisplayElement(header, "h2", artData.title, "Title")
        generateDisplayElement(header, "h3", artData.artist_display, "Artist")

        newAside.appendChild(header)

        generateDisplayElement(newAside, "h4", "Medium")
        generateDisplayElement(newAside, "p", artData.medium_display, "Medium")

        generateDisplayElement(newAside, "h4", "Place of Origin")
        generateDisplayElement(newAside, "p", artData.place_of_origin, "Place of Origin")

        generateDisplayElement(newAside, "h4", "Style")
        generateDisplayElement(newAside, "p", artData.style_title, "Style")

        generateDisplayElement(newAside, "h4", "Image Copyright")
        generateDisplayElement(newAside, "p", imgData.credit_line, "No credit information provided", false)

        return newAside
    }

    /**
     * Updates colors of multiple elements based on the dominant color of the
     * artwork provided.
     *
     * @param {JSON} artData - .data returned with artwork JSON
     */
    function updateColors(artData) {
        /**
         * This is not the ideal way to change style, but since there are
         * exponentially many different colors, I don't think classes are going
         * to work in this case.
         */
        let color = artData.color

        if (color) {
            // Parse color
            let colorStr = "hsl(" + color.h + " " + color.s + "% " + color.l + "%)"
            // Get elements
            let aside = qs(CONTAINER_SELECTOR + " aside")
            let main = qs("main")
            let banner = qs("#banner")
            // Update styles

            banner.style.backgroundColor = colorStr
            aside.style.borderColor = colorStr
            shuffleButton.style.borderColor = colorStr
            main.style.borderColor = colorStr
        }
    }

    /**
     * Updates the copyright information associated with the image fetch in the
     * footer of the main body.
     *
     * @param {JSON} imgInfo - .info returned with images JSON
     */
    function updateCopyright(imgInfo) {
        let main = qs("main")
        let newFooter = gen("footer")

        generateDisplayElement(newFooter, "h3", "License")
        generateDisplayElement(newFooter, "p", imgInfo.license_text, "No license information provided.", false)
        for (let i = 0; i < imgInfo.license_links.length; i++) {
            let p = gen("p")
            let link = gen("a")
            link.href = imgInfo.license_links[i]
            link.textContent = imgInfo.license_links[i]
            p.appendChild(link)
            newFooter.appendChild(p)
        }

        // Remove existing footer and add new one
        let footer = qs("main footer")
        footer.remove()

        main.appendChild(newFooter)
    }

    /**
     * Generates a link and image in the container
     */
    function generateLinkAndImage() {
        /**
         * Having an empty link and image is not great HTML style, so we will
         * instead generate the elements here for use shortly.
         */

        let link = gen("a")
        let img = gen("img")

        link.appendChild(img)
        container.appendChild(link)
    }

    /**
     * Processes the artwork and image JSONs in order to update the website
     * from their contents.
     *
     * @param {JSON} artJson - JSON containing info from the artworks endpoint
     * @param {JSON} imgJson - JSON containing info from the image endpoint
     */
    function processData(artJson, imgJson) {
        const WEB_BASE_URL = "https://www.artic.edu/artworks/"

        // Since the search endpoint returns an array, we need to extract the data
        let artData = artJson.data[0]
        let imgData = imgJson.data

        let link = qs(CONTAINER_SELECTOR + " > a")
        if (!link) {
            generateLinkAndImage()
            link = qs(CONTAINER_SELECTOR + " > a")
        }

        // Replace image
        updateImg(artJson.config, imgData)

        // Link art
        link.href = WEB_BASE_URL + artData.id

        // Generate aside
        let newAside = generateAside(artData, imgData)

        // Remove existing aside and add new one
        let aside = qs(CONTAINER_SELECTOR + " aside")
        aside.remove()

        container.appendChild(newAside)

        // Update colors
        updateColors(artData)

        // Update copyright info
        updateCopyright(imgJson.info)
    }

    /**
     * Updates the page to reflect when the fetch fails too many times.
     *
     * @param {Error} err - error thrown while attempting to fetch artworks
     */
    function processError(err) {
        const CONTAINER_SELECTOR = "#art-display"
        let container = qs(CONTAINER_SELECTOR)

        // Create new aside from data
        let newAside = gen("aside")

        let header = gen("header")

        generateDisplayElement(header, "h2", "Please try again :(")
        generateDisplayElement(header, "h3", "Looks like something went wrong.")

        newAside.appendChild(header)

        generateDisplayElement(newAside, "h4", "Error:")
        generateDisplayElement(newAside, "p", err.message)

        // Remove existing aside and add new one
        let aside = qs(CONTAINER_SELECTOR + " aside")
        aside.remove()

        container.appendChild(newAside)
    }
})();
