module.exports = (error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).render("pageNotFound", {
    title: "Something Went Wrong",
    message: "We could not complete your request. Please try again.",
  });
};
