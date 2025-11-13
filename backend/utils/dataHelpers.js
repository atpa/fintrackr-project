function getNextId(collection) {
  return collection.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
}

function findById(collection, id) {
  return collection.find((item) => Number(item.id) === Number(id));
}

module.exports = {
  getNextId,
  findById,
};
