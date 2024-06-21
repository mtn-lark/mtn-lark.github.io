/**
 * @author Lark Mendoza
 * CS 132 Final Project
 *
 * This API returns ingredient and recipe information for the GrocerEase
 * website.
 */

// Load Modules
"use strict";
const express = require("express");
const multer = require("multer");
const fs = require("fs/promises");
const app = express();

// Constants

// Routes
app.get("/", (req, res) => {
  res.send("Hello from app.js!")
});

// Use set directory for serving static files
app.use(express.static("public"));
// From lecture 18
// for application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true })); // built-in middleware
// for application/json
app.use(express.json()); // built-in middleware
// for multipart/form-data (required with FormData)
app.use(multer().none()); // requires the "multer" module



// Helper functions for /recipes
async function getRecipePrice(ingredientList) {
  let price = 0;
  for (let i = 0; i < ingredientList.length; i++) {
    let ingredientId = ingredientList[i];
    let ingredient = await fs.readFile(`ingredients/${ingredientId}.json`, "utf8");
    let obj = JSON.parse(ingredient);
    price += obj.price;
  }
  return price;
}

async function getRecipeStars(recipeId) {
  let reviewSummary = await fs.readFile(`reviews/${recipeId}/summary.json`);
  let obj = JSON.parse(reviewSummary);
  return obj.stars;
}

function sortByPrice(a, b) {
  if (a.price < b.price) {
    return -1
  } else if (b.price < a.price) {
    return 1
  } return 0
}

function sortByRating(a, b) {
  if (a.stars > b.stars) {
    return -1
  } else if (b.stars > a.stars) {
    return 1
  } return 0
}

async function getRecipePreview(recipeFile) {
  // First, get info from the recipe file
  let recipe = await fs.readFile(`recipes/${recipeFile}`, "utf8");
  let obj = JSON.parse(recipe);
  let newObj = {}
  newObj.recipeid = obj.recipeid;
  newObj.name = obj.name;
  newObj.keywords = obj.keywords;
  newObj.imgpath = obj.imgpath;

  // Next, calculate the price
  newObj.price = await getRecipePrice(obj.ingredients);

  // Finally, calculate the star rating
  newObj.stars = await getRecipeStars(obj.recipeid);

  return newObj;
}

/**
 * Returns a list of all recipe previews
 */
app.get("/recipes", async (req, res) => {
  res.type("json");

  try {
    let recipeFiles = await fs.readdir("recipes");
    let previews = [];
    for (let i = 0; i < recipeFiles.length; i++) {
      let file = recipeFiles[i];
      let preview = await getRecipePreview(file);
      previews.push(preview);
    }
    res.send(previews)
  } catch (err) {
    // console.log(err);
    // res.status(500).send(SERVER_ERROR);
  }
});

// Helper functions for /recipe
async function getIngredientInfo(ingredientList) {
  let ingredientInfo = {};

  for (let i = 0; i < ingredientList.length; i++) {
    let ingredientId = ingredientList[i];
    let ingredient = await fs.readFile(`ingredients/${ingredientId}.json`, "utf8");
    let obj = JSON.parse(ingredient);
    ingredientInfo[ingredientId] = obj;
  }

  return ingredientInfo;
}



/**
 * Returns info for a single recipe
 */
app.get("/recipe/:recipeid", async (req, res) => {
  res.type("json");
  let recipeid = req.params.recipeid;

  try {
    // Base recipe info
    let recipe = await fs.readFile(`recipes/${recipeid}.json`, "utf8");
    let obj = JSON.parse(recipe);

    // Review info
    obj.stars = await getRecipeStars(recipeid);

    let reviewList = await fs.readFile(`reviews/${recipeid}/reviews.json`);
    let reviewObj = JSON.parse(reviewList);

    obj.reviews = reviewObj;

    // Ingredients info
    let ingredientsInfo = await getIngredientInfo(obj.ingredients);
    obj.ingredientsInfo = ingredientsInfo;

    res.send(obj)
  } catch (err) {
    // res.status(500).send(SERVER_ERROR);
    console.log(err);
  }
});

// Returns info for a single ingredient
app.get("/ingredients/:ingredientid", async (req, res) => {
  res.type("json");
  let ingredientid = req.params.ingredientid;
  try {
    let ingredient = await fs.readFile(`ingredients/${ingredientid}.json`, "utf8");
    let obj = JSON.parse(ingredient);

    res.send(obj)

  } catch (err) {
    console.log(err);

  }
});

// Posts a review
app.post("/addReview", async (req, res, next) => {
  let reviewer = req.body.name;
  let stars = Number(req.body.rating);
  let description = req.body["written-review"];
  let recipeid = req.body.recipeid;
  // reject if no reviewer or rating
  // reject if no recipe id

  // create review json
  let result = { "reviewer": reviewer, "stars": stars, "description": description };

  // add review to list of reviews
  const PATH = `reviews/${recipeid}`
  try {
    let reviewList = await fs.readFile(PATH + "/reviews.json", "utf8"); // else continue, writing a new <category>-proposals.json file.
    reviewList = JSON.parse(reviewList);
    reviewList.push(result);
    console.log(reviewList);

    // 5. Write new JSON to same file.
    // try {
    await fs.writeFile(PATH + "/reviews.json", JSON.stringify(reviewList), "utf8");
    res.send(`Request to add ${req.body.name} to menu successfully received!`);
    // } catch (err) {
    //   // res.status(SERVER_ERR_CODE);
    //   // err.message = SERVER_ERROR;
    //   // next(err);
    // }
  } catch (err) {
    console.log(err);
    // if (err.code !== "ENOENT") { // file-not-found error
    //   // res.status(SERVER_ERR_CODE);
    //   // err.message = SERVER_ERROR;
    //   // next(err);
    // }
  }

  // Set number of stars

  // Set number of stars
  try {
    let summary = await fs.readFile(PATH + "/summary.json", "utf8");
    summary = JSON.parse(summary);
    console.log(summary);
    console.log(summary.stars * summary.numreviews);
    console.log(stars);
    console.log(summary.stars * summary.numreviews + stars);
    console.log(summary.numreviews + 1);
    console.log((summary.stars * summary.numreviews + stars) / (summary.numreviews + 1));
    summary.stars = ((summary.stars * summary.numreviews + stars) / (summary.numreviews + 1))
    summary.numreviews = summary.numreviews + 1
    await fs.writeFile(PATH + "/summary.json", JSON.stringify(summary), "utf8");

  } catch (err) {
    console.log(err);
  }
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}...`);
});