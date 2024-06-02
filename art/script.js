/**
 * This handles functionality for the page.
 * It calls the Art Institute of Chicago API's artworks and images endpoints to
 * find and display art that is rarely viewed, along with it's info.
 */

"use strict";
(function () {
    const USER_AGENT = "mtnLark (lark@caltech.edu)"
    // Module-globals
    const API_BASE_URL = "https://api.artic.edu/api/v1/";
    const ART_ENDPOINT = "artworks/"
    const ART_FIELD_STRING = getFieldsString("art")

    const IMG_ENDPOINT = "images/"
    const IMG_FIELD_STRING = getFieldsString("img")

    const WEB_BASE_URL = "https://www.artic.edu/artworks/"
    // Maximum ID as of June 1, 2024 -- not sure how to update this dynamically :(
    const ID_MAX = 273752

    const CONTAINER_SELECTOR = "#art-display"
    const CONTAINER = qs(CONTAINER_SELECTOR)

    let numFails = 0
    let shuffleButton = null

    // SAMPLE ARTIC ART JSON RESPONSE
    const DEMO_ART_DATA = {
        "data": {
            "id": 273752,
            "title": "Jewelry",
            "artist_display": "Ida Ou Nadif\nAnti-Atlas Mountains, Morocco\nNorthern Africa and the Sahel",
            "place_of_origin": "Morocco",
            "medium_display": "Silver, enamel, niello, glass, leather, and fabric",
            "color": {
                "h": 357,
                "l": 41,
                "s": 38,
                "percentage": 0.001690602784422786,
                "population": 12
            },
            "style_title": "ida ou Nadif",
            "image_id": "0e4c9360-83b5-7624-4eb2-4f450f0864f2"
        },
        "info": {
            "license_text": "The `description` field in this response is licensed under a Creative Commons Attribution 4.0 Generic License (CC-By) and the Terms and Conditions of artic.edu. All other data in this response is licensed under a Creative Commons Zero (CC0) 1.0 designation and the Terms and Conditions of artic.edu.",
            "license_links": [
                "https://creativecommons.org/publicdomain/zero/1.0/",
                "https://www.artic.edu/terms"
            ],
            "version": "1.10"
        },
        "config": {
            "iiif_url": "https://www.artic.edu/iiif/2",
            "website_url": "http://www.artic.edu"
        }
    }

    window.addEventListener("load", init);

    //----------------------------------//
    //----- INITIALIZING FUNCTIONS -----//
    //----------------------------------//
    /** Initializes JS functionality for the page. */
    function init() {
        console.log("Hello world!")

        shuffleButton = qs("#shuffle-button");
        shuffleButton.addEventListener("click", getNewArt);

        getNewArt()
    }

    /**
     * Fetches new art and updates the page accordingly.
     */
    function getNewArt() {
        enableShuffleButton(false)
        requestAsync(getRandomId())

        // let artData = requestArtAsync(getRandomId())
        // let imgData = requestImgAsync(getRandomId())

        // processData(artData, imgData)
    }

    /**
     * One-time function to URL-ify the desired API fields.
     *
     * @param {String} type - either "art" or "img"
     * @returns - string to attach to art API request
     */
    function getFieldsString(type) {
        let fields = []
        if (type == "art") {
            fields = [
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
        } else if (type = "img") {
            fields = [
                // Alt-Text
                "alt-text",
                // Copyright
                "credit-line",
                // URL
                "iiif_url",
                "width"
            ]

        } else {
            throw Error("ValueError: type must be 'art' or 'img'.")
        }

        let str = "/?fields="
        for (let i = 0; i < fields.length; i++) {
            str += fields[i] + ","
        }

        return str
    }

    /**
     * Generates a random ID to index art with between 1 and ID_MAX
     *
     * @returns {string} - A random art ID
     */
    function getRandomId() {
        /**
         * Inspired by this:
         * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math#returning_a_random_integer_between_two_bounds
         * We use ceiling and omit the min variable, since our min is just 1.
         */
        const num = Math.ceil(Math.random() * (ID_MAX));
        return String(num);
    }

    //-----------------------------//
    //----- NETWORK FUNCTIONS -----//
    //-----------------------------//

    /**
     * Checks that the response status is valid.
     *
     * @param {Response} response
     * @returns
     */
    function checkStatus(response) {
        if (response.status >= 400) {
            throw Error("StatusError: " + response.status + " " + response.statusText)
        } else {
            return response
        }
    }

    /**
     * Checks that artwork is rarely viewed, has an associated image, and is in
     * public domain.
     *
     * @param {JSON} articJson - JSON returned by art  fetch request
     */
    function checkArtConditions(articJson) {
        let data = articJson.data

        if (!data.has_not_been_viewed_much) {
            throw Error("ValidationError: Viewed too often.")
        } if (!data.image_id) {
            throw Error("ValidationError: No associated image.")
        }
        if (!data.is_public_domain) {
            // recommended by ArtIC
            throw Error("ValidationError: Not public domain.")
        }
    }

    /**
     * Gets the image URL of the artwork for display.
     *
     * @param {String} iiifBaseUrl - the base IIIF URL of the artwork
     * @param {String} iiifPath - the path to append associated with the artwork
     * @param {Number} width - the width of the artwork, in px
     * @returns {String} - the URL for displaying the image
     */
    function getImageURL(iiifBaseUrl, iiifPath, width) {
        /**
         * Per https://api.artic.edu/docs/#iiif-image-api
         * ArtIC recommends sizing with width 843.
         * However, this causes issues if the image is smaller than 843 px wide.
         * This is the workaround
         */

        let sizeStr = "843,/"
        if (width < 843) {
            sizeStr = "pct:100/"
        }
        const STRUCTURE = "/full/" + sizeStr + "0/default.jpg"
        let url = iiifBaseUrl + iiifPath + STRUCTURE
        return url
    }

    function getImageId(artData) {
        return artData.data.image_id
    }


    async function requestArtAsync(artUrl) {
        /**
         * This is a helper function within a try/catch block, so we won't worry
         * about catching errors here.
         */

        let artResp = await fetch(artUrl, {
            headers: {
                // Requested as courtesy
                "AIC-User-Agent": USER_AGENT
            }
        })
        artResp = checkStatus(artResp)        // Check status is valid
        const artData = await artResp.json()  // Convert to json
        checkArtConditions(artData)           // Check ok to display

        return (artData)
    }

    async function requestImgAsync(artData) {
        /**
         * This is a helper function within a try/catch block, so we won't worry
         * about catching errors here.
         */

        // Get img url
        const IMG_ID = getImageId(artData)
        const IMG_URL = API_BASE_URL + IMG_ENDPOINT + IMG_ID + IMG_FIELD_STRING

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
     * Fetches art data of the associated artwork, and validates data.
     *
     * @param {string} id - ID associated with artwork to fetch
     */
    async function requestAsync(id) {
        // Artworks endpoint
        const ART_URL = API_BASE_URL + ART_ENDPOINT + id + ART_FIELD_STRING
        // console.log(url);

        try {
            // First, get artwork information
            let artData = await requestArtAsync(ART_URL)

            // Next, get image information
            let imgData = await requestImgAsync(artData)

            // Update the page
            processData(artData, imgData)           // Process data and update page
            numFails = 0                            // Reset error counter
            enableShuffleButton(true)               // Release shuffle button

        } catch (err) {
            numFails += 1
            console.log("Caught an error");
            console.log(err);
            if (numFails < 10) {
                // Try up to 10 times to find something better
                getNewArt()
            } else {
                // Continuous failure; stop checking
                processError(err);
                numFails = 0;
                enableShuffleButton(true)
            }

        }
    }

    //--------------------------------------//
    //----- DOM MANIPULATION FUNCTIONS -----//
    //--------------------------------------//

    /**
     * Enables or disables the shuffle button.
     *
     * @param {Boolean} enable
     */
    function enableShuffleButton(enable) {
        /**
         * I know toggle would usually be used here, but I found if I was fast
         * enough, I could lock myself out of using the button, so this
         */

        shuffleButton.disabled = !enable
        if (enable) {
            shuffleButton.classList.remove("disabled")
        } else {
            shuffleButton.classList.add("disabled")
        }

    }
    /**
     * Generates a text element in aside with textContent equal to data if
     * data exists, and "Unknown <name>" otherwise.
     *
     * @param {Element} parent - element to parent items to
     * @param {String} elemStr - string describing the type of element to be
     *      created, as in createElement
     * @param {String} [data] - string to try to use as text
     * @param {String} [alternate] - alternate descriptor to use if data is
     *      null; name of attribute if useUnknown=true, otherwise a complete
     *      replacement string. Can be omitted if data is guaranteed.
     * @param {Boolean} [useUnknown=true] useUnknown - indicates whether to use
     *      default "Unknown <alternate>" string or to entirely replace
     * -
     *  use default unknown string
     * @returns
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

    function updateImg(artConfig, imgData) {
        // Replace image + link art
        let iiifBaseUrl = artConfig.iiif_url
        let iiifPath = imgData.iiif_url
        let url = getImageURL(iiifBaseUrl, iiifPath, imgData.width)
        console.log(url);

        let img = qs(CONTAINER_SELECTOR + " img")
        img.src = url
        img.alt_text = imgData.alt_text
    }

    function generateAside(artData, imgData) {
        // Create new aside from data
        let new_aside = gen("aside")

        generateDisplayElement(new_aside, "h2", artData.title, "Title")
        generateDisplayElement(new_aside, "h3", artData.artist_display, "Artist")

        generateDisplayElement(new_aside, "h4", "Medium")
        generateDisplayElement(new_aside, "p", artData.medium_display, "Medium")

        generateDisplayElement(new_aside, "h4", "Place of Origin")
        generateDisplayElement(new_aside, "p", artData.place_of_origin, "Place of Origin")

        generateDisplayElement(new_aside, "h4", "Style")
        generateDisplayElement(new_aside, "p", artData.style_title, "Style")

        generateDisplayElement(new_aside, "h4", "Image Copyright")
        generateDisplayElement(new_aside, "p", imgData.credit_line, "No credit information provided", false)

        return new_aside
    }

    function updateColors(artData) {
        // Can't find a better way to set the color, since classes aren't going
        // to work here
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

    function updateCopyright(imgInfo) {
        let new_footer = gen("footer")

        generateDisplayElement(new_footer, "h3", "License")
        generateDisplayElement(new_footer, "p", imgInfo.license_text, "No license information provided.", false)
        for (let i = 0; i < imgInfo.license_links.length; i++) {
            let p = gen("p")
            let link = gen("a")
            link.href = imgInfo.license_links[i]
            link.textContent = imgInfo.license_links[i]
            p.appendChild(link)
            new_footer.appendChild(p)
        }

        // Remove existing footer and add new one
        let footer = qs("main footer")
        footer.remove()

        CONTAINER.appendChild(new_footer)
    }

    function processData(artJson, imgJson) {
        let artData = artJson.data
        let imgData = imgJson.data
        console.log(artData);

        // Replace image + link art
        updateImg(artJson.config, imgData)

        // Link art
        let link = qs(CONTAINER_SELECTOR + " a")
        link.href = WEB_BASE_URL + artData.id

        // Generate aside
        let new_aside = generateAside(artData, imgData)

        // Remove existing aside and add new one
        let aside = qs(CONTAINER_SELECTOR + " aside")
        aside.remove()

        CONTAINER.appendChild(new_aside)

        // Update colors
        updateColors(artData)

        // Update copyright info
        updateCopyright(imgJson.info)
    }

    function processError(err) {
        const CONTAINER_SELECTOR = "#art-display"
        let container = qs(CONTAINER_SELECTOR)

        // Create new aside from data
        let new_aside = gen("aside")

        generateDisplayElement(new_aside, "h2", "Please try again later.")
        generateDisplayElement(new_aside, "h3", "Looks like something went wrong repeatedly.")

        generateDisplayElement(new_aside, "h4", "Most recent error:")
        generateDisplayElement(new_aside, "p", err.message)

        // Remove existing aside and add new one
        let aside = qs(CONTAINER_SELECTOR + " aside")
        aside.remove()

        container.appendChild(new_aside)
    }
})();