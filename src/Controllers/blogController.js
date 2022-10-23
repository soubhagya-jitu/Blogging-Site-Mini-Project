const blogModel = require("../Models/blogModel")
const authorModel = require("../Models/authorModel")
const { findById, findByIdAndUpdate } = require("../Models/authorModel")
const moment = require("moment")
const { mongo, default: mongoose } = require("mongoose")

const createBlog = async function (req, res) {
    try {
        const blog = req.body
        if (Object.keys(blog).length == 0) return res.status(400).send({ status: false, data: "Please enter the details to create a blog" })
        let { title, body, authorId, tags, category, subcategory, ...rest } = blog

        //-------------------- check mendatory field-------------------------------------//

        if (!title) return res.status(400).send({ data: "title is required" })
        if (!body) return res.status(400).send({ data: "body is required" })
        if (!authorId) return res.status(400).send({ data: "authorId is required" })
        if (!category) return res.status(400).send({ data: "category is required" })
        if (!mongoose.Types.ObjectId.isValid(authorId)) return res.status(400).send({ status: false, msg: "please enter valid author id " })

        // if(req.body.authorId !== req.decodeToken.authorId) return res.status(400).send({status:false,data:"please enter correct authorId"})

        //------------------check author-----------------------------------------------------// 
        const isValid = function (value) {
            if (typeof value === 'undefined' || value === null) return false
            if (typeof value === 'string' && value.trim().length === 0) return false
            return true
        }
        if (!isValid(title)) return res.status(400).send({ status: false, data: "title validation failed" })
        if (!isValid(body)) return res.status(400).send({ status: false, data: "blog validation failed" })

        const authorAvailable = await authorModel.findById(authorId)

        if (!authorAvailable) {
            return res.status(404).send({ status: false, data: "No author is available with the authorId given...!!" })
        }
        if (blog["isPublished"] == true) blog["publishedAt"] = Date.now();


        const blogCreated = await blogModel.create(blog)
        res.status(201).send({ status: true, data: blogCreated })

    } catch (error) {
        res.status(500).send({ status: false, data: error.message })
    }
}
const getBlogs = async function (req, res) {
    try {

        const save = req.query
        let author_id = req.query.authorId
        if (author_id) {
            if (!mongoose.Types.ObjectId.isValid(author_id)) return res.status(400).send({ status: false, msg: "please enter valid author id " })
        }

        let findData = { isDeleted: false, isPublished: true, ...save }

        const blog = await blogModel.find(findData);

        if (blog.length == 0) return res.status(404).send({ status: false, data: "No blogs found" })

        return res.status(200).send({ status: true, data: blog });
    } catch (error) {
        res.status(500).send({ status: false, data: error.message })
    }
}



const updateBlog = async function (req, res) {

    try {
        let id = req.params.blogId
        if (!id) return res.status(404).send({ status: false, data: "blogId is not present" })
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).send({ status: false, data: "blog id validation failed" })

        let blog = await blogModel.findById(id)

        if (!blog) return res.status(404).send({ status: false, data: "blog is not present" })

        if (blog.isDeleted == true) return res.status(200).send({ status: false, msg: "blog is already deleted" })

        let data = req.body
        if (Object.keys(data).length == 0) return res.status(400).send({ status: false, msg: "Please include atleast one properties to be updated" })

        let updateBlog = await blogModel.findByIdAndUpdate(id, {
            $set: { title: data.title, body: data.body, publishedAt: Date.now(), isPublished: true },
            $push: { tags: data.tags, subcategory: data.subcategory }
        }, { new: true })

        res.status(200).send({ status: true, message: "Blog update is successful", data: updateBlog })
    } catch (error) {
        res.status(500).send({ status: false, data: error.message })
    }

}

const deletebyBlogId = async function (req, res) {
    try {

        let blogId = req.params.blogId

        let blog = await blogModel.findById(blogId);
        if (!blog) return res.status(404).send({ status: false, data: " blog not found" });

        if (blog.isDeleted == false) {
            await blogModel.findOneAndUpdate({ _id: blogId }, { $set: { isDeleted: true, deletedAt: Date.now() } }, { new: true });
            return res.status(200).send({ status: true, message: "Blog deletion is successful" });
        } else {
            res.status(200).send({ status: false, data: "already deleted" });
        }

    } catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}

let deleteByQuery = async function (req, res) {
    try {

        let { ...data } = req.query;

        //validating the data for empty values
        if (Object.keys(data).length == 0) return res.send({ status: false, msg: "Fill the Query" });

        if (data.hasOwnProperty('authorId')) {
            if (!mongoose.Types.ObjectId.isValid(data.authorId)) return res.status(400).send({ status: false, msg: "Enter a valid author Id" });
            if (req.decodeToken.authorId !== data.authorId) return res.status(403).send({ status: false, msg: "you are not authorised" })
        }

        let timeStamps = new Date();

        let getBlogData = await blogModel.find({ authorId: req.decodeToken.authorId, data });

        //if match not found 
        if (getBlogData.length == 0) {
            return res.status(404).send({ status: false, msg: "No blog found" });
        }

        const getNotDeletedBlog = getBlogData.filter(item => item.isDeleted === false);

        if (getNotDeletedBlog.length == 0) {
            return res.status(404).send({ status: false, msg: "The Blog is already deleted" });
        }

        data.authorId = req.decodeToken.authorId;
        let deletedBlogs = await blogModel.updateMany(
            data,
            { isDeleted: true, isPublished: false, deletedAt: timeStamps },
        );
        return res.status(200).send({ status: true, msg: "The blogs has been deleted" });

    } catch (error) {
        return res.status(500).send({ status: false, msg: error.message })
    }
}




module.exports.createBlog = createBlog
module.exports.getBlogs = getBlogs
module.exports.updateBlog = updateBlog
module.exports.deletebyBlogId = deletebyBlogId
module.exports.deleteByQuery = deleteByQuery