/**
 * API Features Utility
 * 
 * Provides reusable query building features like filtering, sorting, pagination
 */

class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  /**
   * Filter query based on query parameters
   * Excludes certain fields from filtering
   */
  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search', 'populate'];
    excludedFields.forEach(field => delete queryObj[field]);

    // Advanced filtering with operators ($gt, $gte, $lt, $lte, $in)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  /**
   * Sort results based on sort parameter
   * Default sort by createdAt desc
   */
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  /**
   * Limit fields returned in the response
   */
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      // Exclude Mongoose internal field
      this.query = this.query.select('-__v');
    }
    return this;
  }

  /**
   * Add pagination to query
   * Default page 1, limit 10
   */
  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    this.pagination = {
      page,
      limit
    };
    return this;
  }

  /**
   * Add text search capability
   */
  search(fields) {
    if (this.queryString.search) {
      const searchQuery = {
        $text: { $search: this.queryString.search }
      };
      
      // If no text index exists on the model, use regex search on specified fields
      if (!fields || fields.length === 0) {
        this.query = this.query.find(searchQuery);
      } else {
        const fieldQueries = fields.map(field => ({
          [field]: { $regex: this.queryString.search, $options: 'i' }
        }));
        
        this.query = this.query.find({ $or: fieldQueries });
      }
    }
    return this;
  }

  /**
   * Populate references
   */
  populate() {
    if (this.queryString.populate) {
      const populateFields = this.queryString.populate.split(',');
      populateFields.forEach(field => {
        this.query = this.query.populate(field);
      });
    }
    return this;
  }

  /**
   * Count total documents for pagination
   */
  async countDocuments() {
    // Store the query to clone it for counting
    const countQuery = this.query.model.find(this.query.getQuery());
    const total = await countQuery.countDocuments();
    
    // Calculate total pages
    const limit = this.pagination?.limit || 10;
    const totalPages = Math.ceil(total / limit);
    
    // Extend pagination info
    this.pagination = {
      ...this.pagination,
      total,
      totalPages,
      hasMore: this.pagination?.page < totalPages
    };
    
    return this;
  }
}

module.exports = APIFeatures; 