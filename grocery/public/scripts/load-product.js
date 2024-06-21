"use strict";
(function () {
    let recipeId = 0

    window.addEventListener("load", init)

    function init() {
        // Load info based on recipeId
        recipeId = window.sessionStorage.getItem("recipeId");
        requestRecipeInfo(recipeId);

        // Set review form button
        let submitButton = qs("#submit-btn")
        submitButton.addEventListener("click", function (evt) {
            // Fires when submit event happens on form
            // If we've gotten in here, all HTML5 validation checks have passed
            evt.preventDefault(); // prevent default behavior of submit (page refresh)
            postReview(); // do more validation with JS and then fetch with FormData
        })
    }

    // Button functions
    async function postReview() {
        let params = new FormData(id("review-form"))
        params.append("recipeid", recipeId)
        for (const val of params.keys()) {
            console.log(val);
        }
        try {
            let resp = await fetch("/addReview", { method: "POST", body: params });
            // checkStatus(resp);
            resp = await resp.text()
            window.location.reload()
            // displaySuccess(resp);
        } catch (err) {
            // handleError(err);
        }
    }

    // API Fetches
    async function requestRecipeInfo() {
        const RECIPE_URL = `/recipe/${recipeId}`
        try {
            // Get info
            let recipe = await fetch(RECIPE_URL)
            const recipeData = await recipe.json()

            console.log(recipeData);

            // Update page
            updatePage(recipeData)
        } catch (err) {
            console.log(err);
        }
    }

    // DOM Manipulation
    function generateStarBox(num) {
        let starDiv = gen("div")
        starDiv.classList.add("star-box")
        for (let i = 0; i < Math.round(num); i++) {
            let img = gen("img")
            img.src = "imgs/star.png"
            img.classList.add("icon")
            starDiv.appendChild(img)
        }
        return starDiv
    }

    function generateReview(reviewInfo) {
        let reviewDiv = gen("div")
        reviewDiv.classList.add("review")

        let h4 = gen("h4")
        h4.textContent = reviewInfo.reviewer
        reviewDiv.appendChild(h4)

        let starDiv = generateStarBox(reviewInfo.stars)
        reviewDiv.appendChild(starDiv)

        let desc = gen("p")
        desc.textContent = `"${reviewInfo.description}"`
        reviewDiv.appendChild(desc)

        return reviewDiv
    }

    function generateIngredientTable(ingredients, ingredientsInfo) {
        let table = gen("table")

        // - - - Header
        let thead = gen("thead")
        let headerRow = gen("tr")
        let headerCol1 = gen("th")
        headerCol1.scope = "col"
        headerCol1.textContent = "Ingredient"
        let headerCol2 = gen("th")
        headerCol2.scope = "col"
        headerCol2.textContent = "Price"

        headerRow.appendChild(headerCol1)
        headerRow.appendChild(headerCol2)
        thead.appendChild(headerRow)
        table.appendChild(thead)

        // - - - Body
        let tbody = gen("tbody")
        let price = 0
        for (let i = 0; i < ingredients.length; i++) {
            let ingredientId = ingredients[i]
            let tr = gen("tr")

            let trCol1 = gen("td")
            trCol1.scope = "row"
            trCol1.textContent = ingredientsInfo[ingredientId].name
            tr.appendChild(trCol1)

            let trCol2 = gen("td")
            trCol2.textContent = `$${ingredientsInfo[ingredientId].price}`
            price += ingredientsInfo[ingredientId].price
            tr.appendChild(trCol2)

            tbody.appendChild(tr)
        }
        table.appendChild(tbody)

        // - - - Footer
        let tfoot = gen("tfoot")
        let footRow = gen("tr")
        let footCol1 = gen("th")
        footCol1.scope = "row"
        footCol1.textContent = "Total"

        let footCol2 = gen("td")
        footCol2.textContent = `$${price}`

        footRow.appendChild(footCol1)
        footRow.appendChild(footCol2)
        tfoot.appendChild(footRow)
        table.appendChild(tfoot)

        return table
    }

    function updatePage(recipeData) {
        // Recipe
        let recipeDiv = qs("#recipe")

        // - Image
        let img = gen("img")
        img.src = recipeData.imgpath
        img.alt = recipeData.imgalt
        img.classList.add("recipe-image")

        recipeDiv.appendChild(img)

        // - Recipe info
        let recipeInfoDiv = gen("div")
        recipeInfoDiv.id = "recipe-info"

        // - - Header
        let h2 = gen("h2")
        h2.textContent = recipeData.name
        recipeInfoDiv.appendChild(h2)

        // - - Stars
        let starDiv = generateStarBox(recipeData.stars)
        recipeInfoDiv.appendChild(starDiv)

        // - - Tags
        let tagDiv = gen("div")
        tagDiv.id = "tags"

        let h4 = gen("h4")
        h4.textContent = "Tags:"
        tagDiv.appendChild(h4)

        let tagList = gen("ul")
        for (let i = 0; i < recipeData.keywords.length; i++) {
            let item = gen("li")
            item.textContent = recipeData.keywords[i]
            tagList.appendChild(item)
        }
        tagDiv.appendChild(tagList)
        recipeInfoDiv.appendChild(tagDiv)

        // - - Description
        let desc = gen("p")
        desc.textContent = recipeData.description
        recipeInfoDiv.appendChild(desc)

        // - - Ingredient Table
        let table = generateIngredientTable(recipeData.ingredients, recipeData.ingredientsInfo)

        recipeInfoDiv.appendChild(table)

        recipeDiv.appendChild(recipeInfoDiv)

        // Reviews
        let reviewArea = qs("#review-area")
        for (let i = 0; i < recipeData.reviews.length; i++) {
            reviewArea.appendChild(generateReview(recipeData.reviews[i]))
        }
    }
})();