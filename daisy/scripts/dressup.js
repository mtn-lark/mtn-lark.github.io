/**
 * Module to define interactivity for dressup game on dressup.html
 * Part of CS 132 Creative Project 2
 * */
"use strict";
(function () {
    // any module-globals (limit the use of these when possible)
    const CONTAINER = id("dressup-container")
    const IMG_TYPES = ["head", "face", "neck"]
    let imgIndices = [0, 1, 0]

    window.addEventListener("load", init);

    /** Initializes javascript functionality for the dressup page. */
    function init() {
        console.log("Hello world!");

        initButtons();
        initColorSelect();
    }

    /**
     * Initializes the color select dropdown by
     * 1. generating color options
     * 2. connecting the select element with an eventListener to update the
     *    dressup container background color.
     */
    function initColorSelect() {
        const COLORS = [
            "Charcoal", "Burgundy", "Rust", "Mustard", "Moss", "Olive",
            "Seaweed", "Teal", "Slate", "Plum"
        ]
        let select = qs("select")

        // Add the color options to the dropdown
        for (let i = 0; i < COLORS.length; i++) {
            let option = gen("option")
            option.value = COLORS[i].toLowerCase()
            option.text = COLORS[i]
            select.appendChild(option)
        }

        // Set the background color of the dressup to the default value
        CONTAINER.classList.add(select.value)

        // Change background color when choosing different option
        select.addEventListener("change", () => {
            CONTAINER.removeAttribute("class")
            CONTAINER.classList.add(select.value)
        })
    }

    /**
     * Initializes the clothing select buttons by calculating their direction
     * and clothing type, and connecting the buttons to the iterateImage
     * function.
     */
    function initButtons() {
        let buttons = qsa(".button")
        const numButtons = buttons.length

        /*
        Since the buttons are in a grid layout, which reads:
            left-button, icon, right-button
        . . . the odd-indexed buttons will be right facing, and the even left.

        So, left buttons will have mod_2 = 0, and right buttons will have
        mod_2 = 1. Mathematically we can set the direction to -1/1 without an
        if statement by multiplying that mod by 2 and subtracting 1.

        To get the type, the first 2 buttons will be type 0, the next 2, type 1
        ... so we can use integer division to get the correct type index.
        */
        for (let i = 0; i < numButtons; i++) {
            let typeIndex = Math.floor(i / 2)
            let dir = 2 * (i % 2) - 1

            buttons[i].addEventListener("click", () => {
                iterateImage(dir, typeIndex)
            })
        }
    }

    /**
     * Updates the respective image index to go to the next/previous image for
     * the image type.
     *
     * @param {number} direction - 1 or -1, the direction to iterate the image index
     * @param {number} typeIndex - integer index for IMG_TYPE
     */
    function iterateImage(direction, typeIndex) {
        const IMG_MAXES = [3, 4, 3]

        let newIndex = imgIndices[typeIndex] + direction
        // console.log(newIndex);
        if (newIndex < 0) {
            // Loop back to end of list
            newIndex = IMG_MAXES[typeIndex]
        } else if (newIndex > IMG_MAXES[typeIndex]) {
            // Loop back to "front" of list (no image)
            newIndex = 0
        }
        imgIndices[typeIndex] = newIndex

        setImage(newIndex, typeIndex)
    }

    /**
     * Updates the image of the respective image type to the desired index.
     *
     * @param {number} index - index for the desired image; 0 for no image,
     *      positive integer otherwise
     * @param {*} typeIndex - integer index for IMG_TYPE
     */
    function setImage(index, typeIndex) {
        const PATH = "./imgs/dressup/"
        let type = IMG_TYPES[typeIndex]

        let img = qs(`#dressup-container #dressup-${type}`)

        if (img) {
            // Image exists in the dressup container!
            if (index == 0) {
                // Destroy image
                CONTAINER.removeChild(img)
            } else {
                // Update image
                img.src = PATH + `${type}-${index}.png`
            }
        } else {
            // Create image
            console.log(index);
            img = gen("img")
            img.src = PATH + `${type}-${index}.png`
            img.id = `dressup-${type}`

            CONTAINER.appendChild(img)
        }
    }

})();