"use strict";
(function () {

    window.addEventListener("load", init)

    function init() {
        requestRecipePreviews()
    }

    // API Fetches
    async function requestRecipePreviews() {
        const PREVIEWS_URL = "/recipes"
        try {
            // Get info
            let previews = await fetch(PREVIEWS_URL)
            const previewsData = await previews.json()

            // Update page
            updateCards(previewsData)
        } catch (err) {
            console.log(err);
        }
    }

    // DOM Updates
    function updateCards(previewsData) {
        let recipeList = qs("#recipe-list")
        for (let i = 0; i < previewsData.length; i++) {
            let card = generateRecipeCard(previewsData[i])
            recipeList.appendChild(card)
        }
    }

    function generateRecipeCard(data) {
        // console.log(data)
        parent = gen("div")
        parent.classList.add("recipe-info")

        // Image
        let imgLink = gen("a")
        imgLink.href = "product.html"

        let img = gen("img")
        img.src = data.imgpath
        img.alt = data.imgalt
        img.classList.add("recipe-image")

        imgLink.addEventListener("click", () => { setSessionRecipeId(data.recipeid) })
        imgLink.appendChild(img)
        parent.appendChild(imgLink)

        // Header
        let hLink = gen("a")
        hLink.href = "product.html"

        let h = gen("h2")
        h.textContent = data.name

        hLink.appendChild(h)
        hLink.addEventListener("click", () => { setSessionRecipeId(data.recipeid) })
        parent.appendChild(hLink)

        // Footer
        let cardFooter = gen("div")
        cardFooter.classList.add("recipe-footer")

        // Price
        let price = gen("p")
        price.textContent = `$${data.price}`

        cardFooter.appendChild(price)

        // Stars
        let starDiv = gen("div")
        for (let i = 0; i < Math.round(data.stars); i++) {
            let img = gen("img")
            img.src = "imgs/star.png"
            img.classList.add("icon")
            starDiv.appendChild(img)
        }

        cardFooter.appendChild(starDiv)

        // Add to cart button
        let button = gen("button")
        button.classList.add("add-to-cart-btn")

        let cartIcon = gen("img")
        cartIcon.src = "imgs/add-to-cart.png"
        cartIcon.alt = "add to cart"
        cartIcon.classList.add("icon")

        button.appendChild(cartIcon)

        cardFooter.appendChild(button)

        parent.appendChild(cardFooter)

        return parent
    }

    function setSessionRecipeId(recipeId) {
        window.sessionStorage.setItem("recipeId", recipeId);
    }
})();
