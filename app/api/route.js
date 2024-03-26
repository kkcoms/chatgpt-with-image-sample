import fs from 'fs'
import path from 'path'
import { chatCompletion } from '../../services/openai'
import { trim_array, compact } from '../../lib/utils'
import get_image_for_analysis from '../../assets/get_image_for_analysis.json'
import captions from '../../assets/captions.json'

function base64_encode(file) {
    try {
        let bitmap = fs.readFileSync(file)
        let base64 = Buffer.from(bitmap).toString('base64')

        let ext = path.extname(file)
        let mimeType = 'image/' + (ext === '.jpg' ? 'jpeg' : ext.slice(1))

        return `data:${mimeType};base64,${base64}`
    } catch (err) {
        console.error(err)
        return null
    }
}

const useVision = async (args, inquiry = '', context = []) => {
    const { query, images } = args

    let image_items = []

    for (let image of images) {
        if (image.startsWith('data:')) {
            // Image is already a data URL, use it directly
            image_items.push(image)
        } else {
            // Image is a file path, read the file and convert it to a data URL
            let image_file = path.join('public', image)
            let image_base64 = base64_encode(image_file)

            if (image_base64) {
                image_items.push(image_base64)
            }
        }
    }

    if (image_items.length === 0) {
        return { status: 'error', message: 'Failed to make analysis. No image found' }
    }

    let system_prompt = `You are a helpful and knowledgeable assistant for a dry cleaning business, adept at analyzing images and engaging customers in detailed conversations to provide accurate and personalized service information. Your extensive database includes garment types, fabric materials, stain types, treatment options, and pricing strategies. When a customer presents a query, especially those involving image-based stain assessment, you're equipped to offer initial observations, make assumptions, provide a preliminary estimate, and then engage the customer with specific questions to narrow down the details for a more accurate estimate and tailored service recommendation.\n\n` +
    `Your capabilities have been enhanced to include:\n\n` +
    `- **Interactive FAQs Handling**: Actively engage in dialogue to understand and fully address customer inquiries, using back-and-forth communication to clarify details and provide comprehensive answers.\n` +
    `- **Precise Price Estimates**: Initially offer estimates based on general observations and assumptions. Refine these estimates to provide narrower price ranges based on detailed information obtained from the customer's responses about fabric type, garment complexity, and specific stain treatments required.\n` +
    `- **Detailed Stain Assessment**: Analyze customer-provided images to identify stain types and fabric materials. Use this analysis along with follow-up questions to recommend the most appropriate cleaning treatments and provide accurate cost estimations.\n` +
    `- **Customized Service Recommendations**: Based on the conversation, suggest specific cleaning options and care tips tailored to the customer's unique needs, enhancing the personalized service experience.\n` +
    `- **Comprehensive Support**: Throughout the interaction, offer guidance on scheduling a drop-off, information about touchless service options, and any other support the customer may require, ensuring they feel heard and assisted at every step.\n\n` +
    `Example interaction flow to ensure a dynamic and responsive dialogue:\n\n` +
    `1. "Based on the image you've provided and my initial assessment, it looks like the garment is a cotton shirt with oil-based stains, typically from food. Cleaning and stain removal for such items generally range from $5 to $10. Can you confirm the fabric type and how recent the stain is for a more precise estimate?"\n` +
    `2. "Given the details you've provided, especially if the stain is recent, we recommend our specialized stain removal process. The adjusted cost, considering it's a cotton fabric and based on the stain's complexity, could range from $7 to $12. Would you like to proceed with scheduling a drop-off for a more detailed assessment?"\n` +
    `3. "Is there anything else you need assistance with? Perhaps information on our care treatments for different fabrics or our touchless drop-off and payment options?"\n\n` +
    `This comprehensive approach is designed to simulate a friendly and efficient service representative, providing answers that are not only helpful and accurate but also tailored specifically to the customer's needs and inquiries. Your ultimate goal is to deliver a service experience that is informative, engaging, and reassuring, ensuring every customer feels valued and supported.\n` +
    `Today is ${new Date()}.`;

    let messages = [{ role: 'system', content: system_prompt }]
    if (context.length > 0) {
        messages = messages.concat(context)
    }
    if (inquiry) {
        messages.push({ role: 'user', content: inquiry })
    }

    let user_content = [{ type: 'text', text: query }]

    for (let image of image_items) {
        user_content.push({ type: 'image_url', image_url: { url: image } })
    }

    messages.push({ role: 'user', content: user_content })

    let result_output = {}

    try {
        const result = await chatCompletion({
            model: 'gpt-4-vision-preview',
            messages: messages
        })

        result_output = {
            status: 'success',
            message: result.message.content
        }
    } catch (error) {
        console.log(error.name, error.message)

        result_output = { status: 'error', error: error.message, message: 'Failed to analyze image. An unexpected error occurred.' }
    }

    return result_output
}

export async function POST(request) {
    const { lang = 0, inquiry, previous, image } = await request.json()

    if (!inquiry || !Array.isArray(previous)) {
        return new Response('Bad request', {
            status: 400,
        })
    }

    let prev_data = trim_array(previous, 20)

    let isImageExist = image && Array.isArray(image) && image.length > 0

    const tools = [
        { type: 'function', function: get_image_for_analysis },
    ]

    let system_prompt = `You are a helpful assistant.\n`

    let vision_prompt = `You are a helpful and knowledgeable assistant for a dry cleaning business, adept at analyzing images and engaging customers in detailed conversations to provide accurate and personalized service information. Your extensive database includes garment types, fabric materials, stain types, treatment options, and pricing strategies. When a customer presents a query, especially those involving image-based stain assessment, you're equipped to offer initial observations, make assumptions, provide a preliminary estimate, and then engage the customer with specific questions to narrow down the details for a more accurate estimate and tailored service recommendation.\n\n` +
    `Your capabilities have been enhanced to include:\n\n` +
    `- **Interactive FAQs Handling**: Actively engage in dialogue to understand and fully address customer inquiries, using back-and-forth communication to clarify details and provide comprehensive answers.\n` +
    `- **Precise Price Estimates**: Initially offer estimates based on general observations and assumptions. Refine these estimates to provide narrower price ranges based on detailed information obtained from the customer's responses about fabric type, garment complexity, and specific stain treatments required.\n` +
    `- **Detailed Stain Assessment**: Analyze customer-provided images to identify stain types and fabric materials. Use this analysis along with follow-up questions to recommend the most appropriate cleaning treatments and provide accurate cost estimations.\n` +
    `- **Customized Service Recommendations**: Based on the conversation, suggest specific cleaning options and care tips tailored to the customer's unique needs, enhancing the personalized service experience.\n` +
    `- **Comprehensive Support**: Throughout the interaction, offer guidance on scheduling a drop-off, information about touchless service options, and any other support the customer may require, ensuring they feel heard and assisted at every step.\n\n` +
    `Example interaction flow to ensure a dynamic and responsive dialogue:\n\n` +
    `1. "Based on the image you've provided and my initial assessment, it looks like the garment is a cotton shirt with oil-based stains, typically from food. Cleaning and stain removal for such items generally range from $5 to $10. Can you confirm the fabric type and how recent the stain is for a more precise estimate?"\n` +
    `2. "Given the details you've provided, especially if the stain is recent, we recommend our specialized stain removal process. The adjusted cost, considering it's a cotton fabric and based on the stain's complexity, could range from $7 to $12. Would you like to proceed with scheduling a drop-off for a more detailed assessment?"\n` +
    `3. "Is there anything else you need assistance with? Perhaps information on our care treatments for different fabrics or our touchless drop-off and payment options?"\n\n` +
    `This comprehensive approach is designed to simulate a friendly and efficient service representative, providing answers that are not only helpful and accurate but also tailored specifically to the customer's needs and inquiries. Your ultimate goal is to deliver a service experience that is informative, engaging, and reassuring, ensuring every customer feels valued and supported.\n` +
    `Today is ${new Date()}.`;

    let today = `Today is ${new Date()}.`

    system_prompt += isImageExist ? vision_prompt : ''
    system_prompt += today

    let messages = [{ role: 'system', content: system_prompt }]
    if (prev_data.length > 0) {
        messages = messages.concat(prev_data)
    }

    if (isImageExist) {
        let user_content = [{ type: 'text', text: inquiry }]

        image.forEach((img) => {
            user_content.push({ type: 'image_url', image_url: { url: img } })
        })

        messages.push({ role: 'user', content: user_content })
    } else {
        messages.push({ role: 'user', content: inquiry })
    }

    let result = {}

    try {
        let options = { messages }

        if (isImageExist) {
            options.model = 'gpt-4-vision-preview'
        } else {
            options.tools = tools
        }

        result = await chatCompletion(options)

        console.log('function call', result)
    } catch (error) {
        console.log(error.name, error.message)
    }

    if (result.finish_reason === 'tool_calls') {
        let tool_response = result.message
        let tool_outputs = []

        for (let tool of tool_response.tool_calls) {
            let tool_name = tool.function.name
            let tool_args = JSON.parse(tool.function.arguments)

            console.log(tool_name, tool_args)

            let tool_output_item = { status: 'error', message: 'sorry, function not found' }

            if (tool_name === 'get_image_for_analysis') {
                tool_output_item = await useVision(tool_args, inquiry, prev_data)
            }

            console.log(tool_output_item)

            tool_outputs.push({
                tool_call_id: tool.id,
                role: 'tool',
                name: tool_name,
                content: JSON.stringify(tool_output_item, null, 2)
            })
        }

        messages.push(tool_response)
        for (let output_item of tool_outputs) {
            messages.push(output_item)
        }

        try {
            result = await chatCompletion({
                messages,
                tools
            })

            console.log('summary', result)
        } catch (error) {
            console.log(error.name, error.message)
        }
    }

    return new Response(JSON.stringify({
        result: result.message,
    }), {
        status: 200,
    })
}